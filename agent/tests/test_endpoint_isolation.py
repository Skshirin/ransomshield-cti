import unittest
import sys
import os
from unittest.mock import patch, MagicMock

# Make sure agent directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config as cfg
from isolation_provider import (
    IsolationProvider,
    SimulatedIsolationProvider,
    WindowsSafeDemoIsolationProvider,
)
from telemetry_provider import SimulatedTelemetryProvider, WindowsTelemetryProvider
from agent import Agent


class TestEndpointIsolation(unittest.TestCase):

    def test_1_simulated_isolation_provider_transitions_state_safely(self):
        """1. SimulatedIsolationProvider sets is_isolated and suppresses threat without OS modification."""
        sim_provider = SimulatedTelemetryProvider(scenario="ransomware")
        isolation = SimulatedIsolationProvider(telemetry_provider=sim_provider)

        self.assertFalse(isolation.is_isolated)
        self.assertEqual(sim_provider.scenario, "ransomware")

        # Isolate
        res = isolation.isolate(reason="Ransomware mitigation")
        self.assertTrue(res["success"])
        self.assertTrue(isolation.is_isolated)
        # Ransomware scenario is suppressed
        self.assertEqual(sim_provider.scenario, "normal")

        # Release
        rel_res = isolation.release()
        self.assertTrue(rel_res["success"])
        self.assertFalse(isolation.is_isolated)
        # Scenario restored
        self.assertEqual(sim_provider.scenario, "ransomware")

    def test_2_windows_safe_demo_isolation_provider_preserves_host(self):
        """2. WindowsSafeDemoIsolationProvider sets is_isolated safely without destroying networking."""
        isolation = WindowsSafeDemoIsolationProvider()

        self.assertFalse(isolation.is_isolated)
        res = isolation.isolate(reason="Demo isolation")
        self.assertTrue(res["success"])
        self.assertTrue(isolation.is_isolated)
        self.assertEqual(res["mode"], "WINDOWS_SAFE_DEMO")

        rel_res = isolation.release()
        self.assertTrue(rel_res["success"])
        self.assertFalse(isolation.is_isolated)

    def test_3_agent_selects_correct_isolation_provider_by_mode(self):
        """3. Agent selects SimulatedIsolationProvider for simulated mode and WindowsSafeDemo for real mode."""
        sim_agent = Agent(no_model=True, mode="simulated", scenario="normal")
        self.assertIsInstance(sim_agent.isolation_provider, SimulatedIsolationProvider)

        real_agent = Agent(no_model=True, mode="real")
        self.assertIsInstance(real_agent.isolation_provider, WindowsSafeDemoIsolationProvider)

    def test_4_command_processing_is_strictly_scoped_to_endpoint_id(self):
        """4. Commands are strictly scoped: an agent ONLY executes actions targeting its own endpoint ID."""
        agent3 = Agent(no_model=True, mode="simulated", scenario="normal")
        cfg.ENDPOINT_ID = "ep_test_003"
        cfg.BACKEND_API_KEY = "test_key"
        cfg.BACKEND_API_URL = "http://localhost:4000"

        # Mock action acknowledgment HTTP call
        agent3._acknowledge_action = MagicMock()

        # Pending actions contains command for ep_test_001 and ep_test_003
        pending_actions = [
            {
                "actionId": "act_001",
                "endpointId": "ep_test_001",  # Belongs to ep1, NOT ep3
                "actionType": "ISOLATE",
                "reason": "Threat on EP 1",
            },
            {
                "actionId": "act_003",
                "endpointId": "ep_test_003",  # Belongs to ep3
                "actionType": "ISOLATE",
                "reason": "Threat on EP 3",
            },
        ]

        agent3._process_pending_actions(pending_actions)

        # Agent 3 must be isolated
        self.assertTrue(agent3.isolation_provider.is_isolated)
        # Agent 3 must only acknowledge act_003, NOT act_001
        agent3._acknowledge_action.assert_called_once_with("act_003", status="ACKNOWLEDGED")

    def test_5_unaffected_endpoints_ignore_other_isolation_commands(self):
        """5. Unaffected endpoints (e.g. Endpoint 1 and 2) ignore commands targeted to Endpoint 3."""
        agent1 = Agent(no_model=True, mode="real")
        agent2 = Agent(no_model=True, mode="simulated", scenario="normal")

        cfg.ENDPOINT_ID = "ep_test_001"
        agent1._acknowledge_action = MagicMock()
        agent2._acknowledge_action = MagicMock()

        # Command is targeted only to ep_test_003
        isolate_cmd_for_ep3 = [
            {
                "actionId": "act_003",
                "endpointId": "ep_test_003",
                "actionType": "ISOLATE",
                "reason": "Threat on EP 3",
            }
        ]

        # Agent 1 processes queue
        agent1._process_pending_actions(isolate_cmd_for_ep3)
        self.assertFalse(agent1.isolation_provider.is_isolated)
        agent1._acknowledge_action.assert_not_called()

        # Agent 2 processes queue
        cfg.ENDPOINT_ID = "ep_test_002"
        agent2._process_pending_actions(isolate_cmd_for_ep3)
        self.assertFalse(agent2.isolation_provider.is_isolated)
        agent2._acknowledge_action.assert_not_called()

    def test_6_isolated_endpoint_suppresses_redundant_alert_reporting(self):
        """6. When an endpoint is ISOLATED, alert reporting is suppressed."""
        agent = Agent(no_model=True, mode="simulated", scenario="normal")
        cfg.ENDPOINT_ID = "ep_test_003"
        cfg.AUTO_REPORT_DETECTIONS = True
        agent.isolation_provider.is_isolated = True

        # Calling _report_ransomware_alert should return False
        result = agent._report_ransomware_alert(pid=9999, process_name="test_ransom.exe", score=0.95)
        self.assertFalse(result)

    def test_7_multi_agent_coexistence_with_one_isolated(self):
        """7. 3 agents coexist: Agent 3 is isolated while Agent 1 and Agent 2 remain normal."""
        agent1_real = Agent(no_model=True, mode="real")
        agent2_sim_normal = Agent(no_model=True, mode="simulated", scenario="normal")
        agent3_sim_ransom = Agent(no_model=True, mode="simulated", scenario="ransomware")

        # Isolate Agent 3
        agent3_sim_ransom.isolation_provider.isolate(reason="Isolated by analyst")

        self.assertTrue(agent3_sim_ransom.isolation_provider.is_isolated)
        self.assertFalse(agent1_real.isolation_provider.is_isolated)
        self.assertFalse(agent2_sim_normal.isolation_provider.is_isolated)


if __name__ == "__main__":
    unittest.main()
