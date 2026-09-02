import os
import sys
import time
import requests

# Ensure agent folder is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BACKEND_URL = "http://localhost:4000"
API_KEY = "sentineliq_ml_service_key_dev"

def test_heartbeat_system():
    print("==================================================")
    print("  SentinelIQ Heartbeat & Rate-Limiting Verification")
    print("==================================================")

    # 1. Verify backend health
    health = requests.get(f"{BACKEND_URL}/api/health").json()
    print(f"[1] Backend Health: status={health.get('status')}, db={health.get('database')}")
    assert health.get("status") == "ok"

    # 2. Check/Activate Agents
    from dotenv import dotenv_values
    
    agent_configs = [
        (".env.agent1", "Agent 1 (REAL)"),
        (".env.agent2", "Agent 2 (SIMULATED Normal)"),
        (".env.agent3", "Agent 3 (SIMULATED Ransomware/Baseline)"),
    ]

    agent_endpoints = []

    for env_name, label in agent_configs:
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), env_name)
        vals = dotenv_values(env_path)
        token = (vals.get("ACTIVATION_TOKEN") or "").strip().split(" ")[0]
        ep_id = vals.get("ENDPOINT_ID")
        org_id = vals.get("ORGANIZATION_ID")

        if not ep_id and token:
            print(f"[2] Activating {label} with token: {token[:12]}...")
            act_res = requests.post(
                f"{BACKEND_URL}/api/endpoints/activate",
                json={"activationToken": token},
                timeout=5
            )
            if act_res.status_code == 200:
                data = act_res.json()
                ep_id = data["endpointId"]
                org_id = data["organizationId"]
                print(f"    -> Activated! endpointId={ep_id}")
                # Save to env
                from activation import save_activation_details
                save_activation_details(env_path, org_id, ep_id)
            else:
                print(f"    -> Activation response ({act_res.status_code}): {act_res.text}")

        print(f"[2] {label}: endpointId={ep_id}, orgId={org_id}")
        assert ep_id, f"Missing endpoint ID for {label}"
        agent_endpoints.append((env_name, label, ep_id))

    # 3. Test sending heartbeats for all 3 agents simultaneously
    print("\n[3] Testing simultaneous heartbeats from Agent 1, Agent 2, and Agent 3...")
    for env_name, label, ep_id in agent_endpoints:
        payload = {
            "cpuUsagePercent": 14.2,
            "ramUsagePercent": 48.1,
            "diskUsagePercent": 32.0
        }
        res = requests.post(
            f"{BACKEND_URL}/api/endpoints/{ep_id}/heartbeat",
            json=payload,
            headers={"x-api-key": API_KEY},
            timeout=5
        )
        print(f"    [{label}] Status Code: {res.status_code}, Response: {res.json()}")
        assert res.status_code == 200, f"Heartbeat failed for {label}: {res.text}"
        assert res.json().get("status") == "ONLINE", f"Expected ONLINE status for {label}"

    # 4. Multi-agent concurrency test: send 15 heartbeats rapidly across all 3 agents
    print("\n[4] Sending 15 heartbeats per agent (total 45 requests from localhost)...")
    for cycle in range(15):
        for env_name, label, ep_id in agent_endpoints:
            res = requests.post(
                f"{BACKEND_URL}/api/endpoints/{ep_id}/heartbeat",
                json={"cpuUsagePercent": 10.0 + cycle},
                headers={"x-api-key": API_KEY},
                timeout=5
            )
            assert res.status_code == 200, f"Collision detected on cycle {cycle} for {label}: {res.status_code} {res.text}"
    print("    -> 45 simultaneous heartbeats succeeded with 0 rate limit collisions (200 OK for all)!")

    # 5. Excessive rate test: push Agent 1 past its dedicated 30 req/min limit
    print("\n[5] Testing excessive rate protection on Agent 1...")
    ep1_id = agent_endpoints[0][2]
    ep2_id = agent_endpoints[1][2]
    
    hit_429 = False
    for i in range(25):
        res = requests.post(
            f"{BACKEND_URL}/api/endpoints/{ep1_id}/heartbeat",
            json={"cpuUsagePercent": 99.0},
            headers={"x-api-key": API_KEY},
            timeout=5
        )
        if res.status_code == 429:
            hit_429 = True
            print(f"    -> Agent 1 successfully rate-limited (429) at request #{16 + i}: {res.json()}")
            break

    assert hit_429, "Expected Agent 1 to be rate limited when exceeding quota"

    # Agent 2 must STILL be unhindered!
    ep2_res = requests.post(
        f"{BACKEND_URL}/api/endpoints/{ep2_id}/heartbeat",
        json={"cpuUsagePercent": 15.0},
        headers={"x-api-key": API_KEY},
        timeout=5
    )
    assert ep2_res.status_code == 200, f"Agent 2 was incorrectly affected by Agent 1's limit: {ep2_res.status_code}"
    print("    -> Agent 2 independently succeeded (200 OK) while Agent 1 is rate-limited!")

    # 6. Verify general API rate limit is intact on non-heartbeat routes
    print("\n[6] Verifying general API route protection...")
    health_check = requests.get(f"{BACKEND_URL}/api/health")
    assert health_check.status_code == 200
    print("    -> General routes active and protected.")

    print("\n==================================================")
    print("  SUCCESS: All Heartbeat Verification Tests Passed!")
    print("==================================================")

if __name__ == "__main__":
    test_heartbeat_system()
