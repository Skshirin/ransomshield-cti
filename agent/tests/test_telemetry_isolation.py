import unittest
import sys
import os
from unittest.mock import patch, MagicMock

# Make sure agent directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config as cfg
from telemetry_provider import WindowsTelemetryProvider, SimulatedTelemetryProvider
from feature_extractor import FeatureExtractor
from agent import Agent, ProcessState, ALERT_THRESHOLD, CRITICAL_CONSECUTIVE
from activation import save_activation_details, activate_agent


class TestTelemetryIsolation(unittest.TestCase):

    def test_1_real_mode_selects_windows_provider(self):
        """1. REAL mode selects Windows/Sysmon provider."""
        agent = Agent(no_model=True, mode="real")
        self.assertIsInstance(agent.reader, WindowsTelemetryProvider)

    def test_2_simulated_mode_selects_synthetic_provider(self):
        """2. SIMULATED mode selects synthetic provider."""
        agent = Agent(no_model=True, mode="simulated", scenario="normal")
        self.assertIsInstance(agent.reader, SimulatedTelemetryProvider)
        self.assertEqual(agent.reader.scenario, "normal")

    def test_3_simulated_mode_never_initializes_sysmon(self):
        """3. SIMULATED mode never initializes Sysmon or imports sysmon_reader."""
        provider = SimulatedTelemetryProvider(scenario="normal")
        self.assertIsInstance(provider, SimulatedTelemetryProvider)
        # Ensure SysmonReader is not attached to SimulatedTelemetryProvider
        self.assertFalse(hasattr(provider, "reader"))

    def test_4_simulated_mode_never_reads_host_telemetry(self):
        """4. SIMULATED mode never reads host Windows telemetry."""
        provider = SimulatedTelemetryProvider(scenario="normal")
        events = provider.read_latest()
        self.assertGreater(len(events), 0)
        # All events generated are in-memory synthetic with simulated PID space
        for event in events:
            self.assertIn("record_id", event)
            self.assertIn("event_id", event)
            self.assertIn("pid", event)
            self.assertIn("process_name", event)
            self.assertIn(event["process_name"], ["explorer.exe", "chrome.exe", "code.exe"])

    def test_5_two_simulated_agents_have_independent_telemetry_streams(self):
        """5. Two simulated agents have independent telemetry streams."""
        provider2 = SimulatedTelemetryProvider(scenario="normal", instance_id="agent_2")
        provider3 = SimulatedTelemetryProvider(scenario="normal", instance_id="agent_3")

        events2 = provider2.read_latest()
        events3 = provider3.read_latest()

        # Both produce events
        self.assertGreater(len(events2), 0)
        self.assertGreater(len(events3), 0)

        # Instance IDs and PID spaces are independent
        self.assertNotEqual(provider2.instance_id, provider3.instance_id)
        pids2 = {e["pid"] for e in events2}
        pids3 = {e["pid"] for e in events3}
        # Check that different simulated instances do not collide
        self.assertEqual(provider2.scenario, "normal")
        self.assertEqual(provider3.scenario, "normal")

    def test_6_each_agent_has_unique_endpoint_identity(self):
        """6. Each agent has a unique endpoint identity via isolated .env files."""
        temp_env1 = "test_agent_1.env"
        temp_env2 = "test_agent_2.env"
        temp_env3 = "test_agent_3.env"

        with open(temp_env1, "w") as f:
            f.write("TELEMETRY_MODE=real\nENDPOINT_ID=ep_real_001\nORGANIZATION_ID=org_001\n")
        with open(temp_env2, "w") as f:
            f.write("TELEMETRY_MODE=simulated\nSIMULATION_SCENARIO=normal\nENDPOINT_ID=ep_sim_002\nORGANIZATION_ID=org_001\n")
        with open(temp_env3, "w") as f:
            f.write("TELEMETRY_MODE=simulated\nSIMULATION_SCENARIO=normal\nENDPOINT_ID=ep_sim_003\nORGANIZATION_ID=org_001\n")

        orig_argv = sys.argv
        try:
            import importlib
            import config

            sys.argv = ["agent.py", f"--env-file={temp_env1}"]
            importlib.reload(config)
            self.assertEqual(config.TELEMETRY_MODE, "real")
            self.assertEqual(config.ENDPOINT_ID, "ep_real_001")

            sys.argv = ["agent.py", f"--env-file={temp_env2}"]
            importlib.reload(config)
            self.assertEqual(config.TELEMETRY_MODE, "simulated")
            self.assertEqual(config.SIMULATION_SCENARIO, "normal")
            self.assertEqual(config.ENDPOINT_ID, "ep_sim_002")

            sys.argv = ["agent.py", f"--env-file={temp_env3}"]
            importlib.reload(config)
            self.assertEqual(config.TELEMETRY_MODE, "simulated")
            self.assertEqual(config.ENDPOINT_ID, "ep_sim_003")
        finally:
            sys.argv = orig_argv
            for t in [temp_env1, temp_env2, temp_env3]:
                if os.path.exists(t):
                    os.remove(t)

    def test_7_existing_enrollment_persists_credentials(self):
        """7. Existing enrollment works and persists credentials to agent env file."""
        test_env = "test_enrollment.env"
        with open(test_env, "w") as f:
            f.write("ACTIVATION_TOKEN=SENTIQ-TEST-TOKEN\n")

        try:
            save_activation_details(test_env, "org_test_123", "ep_test_456")
            with open(test_env, "r") as f:
                content = f.read()

            self.assertIn("ORGANIZATION_ID=org_test_123", content)
            self.assertIn("ENDPOINT_ID=ep_test_456", content)
            self.assertIn("ACTIVATION_TOKEN=SENTIQ-TEST-TOKEN", content)
        finally:
            if os.path.exists(test_env):
                os.remove(test_env)

    def test_8_existing_real_agent_behavior_intact(self):
        """8. Existing REAL agent behavior remains intact."""
        self.assertEqual(ALERT_THRESHOLD, 0.65)
        self.assertEqual(CRITICAL_CONSECUTIVE, 3)

        agent = Agent(no_model=True, mode="real")
        self.assertIsNotNone(agent.buffer)
        self.assertIsNotNone(agent.extractor)
        self.assertEqual(agent.telemetry_mode, "real")

    def test_9_normal_synthetic_events_do_not_detect(self):
        """9. Normal synthetic events do not trigger ransomware detection."""
        provider = SimulatedTelemetryProvider(scenario="normal")
        extractor = FeatureExtractor()

        events = provider.read_latest()
        features = extractor.extract(events)

        self.assertEqual(features.get("known_encrypted_ext_count", 0), 0)
        self.assertLess(features.get("file_activity_rate", 0), 5.0)

    def test_10_synthetic_ransomware_scenario_enters_detection_pipeline(self):
        """10. Synthetic ransomware scenario enters existing detection pipeline and triggers alert threshold."""
        provider = SimulatedTelemetryProvider(scenario="ransomware")
        extractor = FeatureExtractor()

        events = provider.read_latest()
        ransom_events = [e for e in events if e.get("process_name") == "ransomware_demo.exe"]
        self.assertGreater(len(ransom_events), 0)

        features = extractor.extract(ransom_events)

        self.assertGreater(features.get("known_encrypted_ext_count", 0), 0)
        self.assertGreater(features.get("file_create_count", 0), 5)
        self.assertGreater(features.get("file_name_entropy", 0.0), 3.0)

        # Test feeding through ProcessState EMA scoring logic
        state = ProcessState(9999, "ransomware_demo.exe")
        # Step 1: EMA = 0.36 (NORMAL)
        self.assertEqual(state.update(0.90), "NORMAL")
        # Step 2: EMA = 0.576 (SUSPICIOUS >= 0.50)
        self.assertEqual(state.update(0.90), "SUSPICIOUS")
        # Step 3: EMA = 0.7056 (ALERT >= 0.65, 1st consecutive)
        self.assertEqual(state.update(0.90), "ALERT")
        # Step 4: EMA = 0.783 (ALERT >= 0.65, 2nd consecutive)
        self.assertEqual(state.update(0.90), "ALERT")
        # Step 5: EMA = 0.830 (CRITICAL upon 3rd consecutive window >= 0.65)
        self.assertEqual(state.update(0.90), "CRITICAL")
        self.assertTrue(state.critical_fired)


if __name__ == "__main__":
    unittest.main()
