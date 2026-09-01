import requests
import config as cfg


def save_activation_details(env_file_path: str, org_id: str, endpoint_id: str):
    import os
    # Persist the newly obtained ids to the configured dotenv file
    if not os.path.exists(env_file_path):
        with open(env_file_path, "w") as f:
            f.write(f"ORGANIZATION_ID={org_id}\n")
            f.write(f"ENDPOINT_ID={endpoint_id}\n")
        return

    with open(env_file_path, "r") as f:
        lines = f.readlines()

    new_lines = []
    org_updated = False
    endpoint_updated = False

    for line in lines:
        if line.strip().startswith("ORGANIZATION_ID="):
            new_lines.append(f"ORGANIZATION_ID={org_id}\n")
            org_updated = True
        elif line.strip().startswith("ENDPOINT_ID="):
            new_lines.append(f"ENDPOINT_ID={endpoint_id}\n")
            endpoint_updated = True
        else:
            new_lines.append(line)

    if not org_updated:
        new_lines.append(f"ORGANIZATION_ID={org_id}\n")
    if not endpoint_updated:
        new_lines.append(f"ENDPOINT_ID={endpoint_id}\n")

    with open(env_file_path, "w") as f:
        f.writelines(new_lines)
    print(f"[activation] Persisted ORGANIZATION_ID and ENDPOINT_ID to {env_file_path}")


def activate_agent():
    if cfg.ORGANIZATION_ID and cfg.ENDPOINT_ID:
        print("[activation] Using manually configured ORGANIZATION_ID/ENDPOINT_ID")
        return

    if not cfg.ACTIVATION_TOKEN:
        raise RuntimeError(
            f"No ACTIVATION_TOKEN and no ORGANIZATION_ID/ENDPOINT_ID configured in {cfg.ENV_FILE_PATH} - "
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

    try:
        save_activation_details(cfg.ENV_FILE_PATH, cfg.ORGANIZATION_ID, cfg.ENDPOINT_ID)
    except Exception as e:
        print(f"[activation] Warning: could not persist activation details to file: {e}")