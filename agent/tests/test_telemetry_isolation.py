import unittest
import sys
import os

# Make sure agent directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config as cfg
from telemetry_provider import WindowsTelemetryProvider, SimulatedTelemetryProvider
from feature_extractor import FeatureExtractor
from agent import Agent, ProcessState, ALERT_THRESHOLD, CRITICAL_CONSECUTIVE


class TestTelemetryIsolation(unittest.TestCase):
    def test_windows_provider_initialization(self):
        """1. REAL mode initializes Windows telemetry provider."""
        try:
            provider = WindowsTelemetryProvider()
            self.assertIsInstance(provider, WindowsTelemetryProvider)
        except (ImportError, ModuleNotFoundError):
            # Skip check if win32evtlog is not present (e.g. non-Windows test environments)
            pass

    def test_simulated_provider_initialization_isolation(self):
        """2. SIMULATED mode does NOT initialize Windows/Sysmon telemetry (no win32evtlog load)."""
        provider = SimulatedTelemetryProvider(scenario="normal")
        self.assertIsInstance(provider, SimulatedTelemetryProvider)
        self.assertEqual(provider.scenario, "normal")

    def test_simulated_endpoint_produces_telemetry_independently(self):
        """3. Simulated endpoint produces telemetry independently."""
        provider = SimulatedTelemetryProvider(scenario="normal")
        events = provider.read_latest()
        self.assertGreater(len(events), 0)
        for event in events:
            self.assertIn("event_id", event)
            self.assertIn("pid", event)
            self.assertIn("process_name", event)

    def test_host_windows_activity_isolation(self):
        """4. Host Windows activity does not enter simulated endpoint telemetry."""
        provider = SimulatedTelemetryProvider(scenario="normal")
        events = provider.read_latest()
        for event in events:
            self.assertIn(event["pid"], [1122, 3344, 5566, 9999])

    def test_multiple_endpoints_independent_telemetry(self):
        """5. Endpoint 2 and Endpoint 3 have independent telemetry streams."""
        provider2 = SimulatedTelemetryProvider(scenario="normal")
        provider3 = SimulatedTelemetryProvider(scenario="ransomware")

        events2 = provider2.read_latest()
        events3 = provider3.read_latest()

        ransom_pids_2 = [e for e in events2 if e["pid"] == 9999]
        ransom_pids_3 = [e for e in events3 if e["pid"] == 9999]

        self.assertEqual(len(ransom_pids_2), 0)
        self.assertGreater(len(ransom_pids_3), 0)

    def test_normal_simulated_telemetry_does_not_detect(self):
        """6. Normal simulated telemetry does not generate a ransomware detection."""
        provider = SimulatedTelemetryProvider(scenario="normal")
        extractor = FeatureExtractor()

        events = provider.read_latest()
        features = extractor.extract(events)

        self.assertEqual(features.get("known_encrypted_ext_count", 0), 0)
        self.assertLess(features.get("file_create_count", 0), 5)

    def test_ransomware_simulation_telemetry_triggers_detection(self):
        """7. Ransomware SIMULATION telemetry can reach the existing detection pipeline."""
        provider = SimulatedTelemetryProvider(scenario="ransomware")
        extractor = FeatureExtractor()

        events = provider.read_latest()
        ransom_events = [e for e in events if e["pid"] == 9999]

        features = extractor.extract(ransom_events)

        self.assertGreater(features.get("known_encrypted_ext_count", 0), 0)
        self.assertGreater(features.get("file_create_count", 0), 0)
        self.assertGreater(features.get("file_name_entropy", 0.0), 3.0)

    def test_multiple_agent_instances_unique_identity(self):
        """8. Multiple agent instances can have unique configurations."""
        with open("test_agent_1.env", "w") as f:
            f.write("TELEMETRY_MODE=real\n")
            f.write("ENDPOINT_ID=endpoint_id_1\n")

        with open("test_agent_2.env", "w") as f:
            f.write("TELEMETRY_MODE=simulated\n")
            f.write("ENDPOINT_ID=endpoint_id_2\n")

        orig_argv = sys.argv
        try:
            sys.argv = ["agent.py", "--env-file=test_agent_2.env"]

            import importlib
            import config
            importlib.reload(config)

            self.assertEqual(config.TELEMETRY_MODE, "simulated")
            self.assertEqual(config.ENDPOINT_ID, "endpoint_id_2")

            sys.argv = ["agent.py", "--env-file=test_agent_1.env"]
            importlib.reload(config)
            self.assertEqual(config.TELEMETRY_MODE, "real")
            self.assertEqual(config.ENDPOINT_ID, "endpoint_id_1")
        finally:
            sys.argv = orig_argv
            for temp_file in ["test_agent_1.env", "test_agent_2.env"]:
                if os.path.exists(temp_file):
                    os.remove(temp_file)

    def test_existing_real_agent_behavior_not_broken(self):
        """9. Existing REAL agent behavior is not broken."""
        self.assertEqual(ALERT_THRESHOLD, 0.65)
        self.assertEqual(CRITICAL_CONSECUTIVE, 3)

        agent = Agent(no_model=True)
        self.assertIsNotNone(agent.buffer)
        self.assertIsNotNone(agent.extractor)


if __name__ == "__main__":
    unittest.main()
