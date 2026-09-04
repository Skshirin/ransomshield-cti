"""
isolation_provider.py
=====================
Safe Endpoint Isolation Abstraction for SentinelIQ.

Provides:
- SimulatedIsolationProvider: In-memory safe state isolation for simulated agents.
- WindowsSafeDemoIsolationProvider: Non-destructive demonstration isolation for real endpoints.
"""

from typing import Dict, Any, Optional


class IsolationProvider:
    """Abstract base class for endpoint isolation response."""

    def __init__(self):
        self.is_isolated: bool = False
        self.isolation_reason: Optional[str] = None

    def isolate(self, reason: Optional[str] = None) -> Dict[str, Any]:
        """Isolate the endpoint."""
        raise NotImplementedError("Subclasses must implement isolate()")

    def release(self) -> Dict[str, Any]:
        """Release isolation and restore normal status."""
        raise NotImplementedError("Subclasses must implement release()")


class SimulatedIsolationProvider(IsolationProvider):
    """
    Safe in-memory isolation provider for simulated agents.
    
    GUARANTEES:
    - Never modifies host network or firewall rules.
    - Never terminates host processes.
    - Transitions internal agent state to ISOLATED and suppresses simulated threat generation.
    """

    def __init__(self, telemetry_provider: Optional[Any] = None):
        super().__init__()
        self.telemetry_provider = telemetry_provider
        self.saved_scenario: Optional[str] = None

    def isolate(self, reason: Optional[str] = None) -> Dict[str, Any]:
        self.is_isolated = True
        self.isolation_reason = reason or "Simulated isolation command received"

        # Suppress active ransomware simulation while isolated
        if self.telemetry_provider and hasattr(self.telemetry_provider, "scenario"):
            self.saved_scenario = self.telemetry_provider.scenario
            if self.telemetry_provider.scenario == "ransomware":
                self.telemetry_provider.set_scenario("normal")

        return {
            "success": True,
            "mode": "SIMULATED",
            "is_isolated": True,
            "reason": self.isolation_reason,
            "message": "Simulated endpoint successfully placed in isolated state.",
        }

    def release(self) -> Dict[str, Any]:
        self.is_isolated = False
        self.isolation_reason = None

        # Restore saved scenario if appropriate
        if self.telemetry_provider and self.saved_scenario and hasattr(self.telemetry_provider, "set_scenario"):
            self.telemetry_provider.set_scenario(self.saved_scenario)
            self.saved_scenario = None

        return {
            "success": True,
            "mode": "SIMULATED",
            "is_isolated": False,
            "message": "Simulated endpoint isolation released. Normal telemetry resumed.",
        }


class WindowsSafeDemoIsolationProvider(IsolationProvider):
    """
    Safe demonstration isolation provider for real Windows endpoints.
    
    GUARANTEES:
    - Never disables physical host network interface.
    - Never executes destructive firewall modifications or process termination.
    - Accurately acknowledges isolation command and transitions internal reporting state.
    """

    def isolate(self, reason: Optional[str] = None) -> Dict[str, Any]:
        self.is_isolated = True
        self.isolation_reason = reason or "Real endpoint safe demo isolation"

        return {
            "success": True,
            "mode": "WINDOWS_SAFE_DEMO",
            "is_isolated": True,
            "reason": self.isolation_reason,
            "message": "Safe demo isolation active: Internal status set to ISOLATED (host network preserved).",
        }

    def release(self) -> Dict[str, Any]:
        self.is_isolated = False
        self.isolation_reason = None

        return {
            "success": True,
            "mode": "WINDOWS_SAFE_DEMO",
            "is_isolated": False,
            "message": "Safe demo isolation released. Status returned to normal.",
        }
