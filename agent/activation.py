import requests
import config as cfg


def activate_agent():
    """
    Resolves which organization/endpoint this agent belongs to. If
    ORGANIZATION_ID and ENDPOINT_ID are already set manually in .env (the
    old flow from earlier milestones), those are used directly and no
    network call happens - keeps existing setups working unchanged.

    Otherwise, calls the backend's /activate endpoint with ACTIVATION_TOKEN,
    matching the "paste token, agent goes ONLINE" flow shown in the
    dashboard's Add Endpoint modal. Mutates cfg.ORGANIZATION_ID and
    cfg.ENDPOINT_ID directly on the config module so every other module
    that reads them at call time (not at import time) picks up the
    resolved values immediately.
    """
    if cfg.ORGANIZATION_ID and cfg.ENDPOINT_ID:
        print("[activation] Using manually configured ORGANIZATION_ID/ENDPOINT_ID")
        return

    if not cfg.ACTIVATION_TOKEN:
        raise RuntimeError(
            "No ACTIVATION_TOKEN and no ORGANIZATION_ID/ENDPOINT_ID set in agent/.env - "
            "the agent cannot start. Set one or the other."
        )

    print("[activation] Activating with token...")
    response = requests.post(
        f"{cfg.BACKEND_API_URL}/api/endpoints/activate",
        json={"activationToken": cfg.ACTIVATION_TOKEN},
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()

    cfg.ORGANIZATION_ID = data["organizationId"]
    cfg.ENDPOINT_ID = data["endpointId"]
    print(f"[activation] Activated. organizationId={cfg.ORGANIZATION_ID} endpointId={cfg.ENDPOINT_ID}")