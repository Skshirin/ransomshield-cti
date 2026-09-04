import assert from "node:assert";
import { createApp } from "../app";
import { Server } from "node:http";
import { env } from "../config/env";
import { connectDatabase } from "../config/database";
import mongoose from "mongoose";
import { EndpointModel } from "../models/endpoint.model";
import { EndpointActionModel } from "../models/endpointAction.model";
import { DetectionModel } from "../models/detection.model";
import { signAccessToken } from "../utils/jwt";

async function runTests() {
  console.log("=== Starting Endpoint Isolation & Response Tests ===");

  await connectDatabase();
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const orgId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();
    const adminToken = signAccessToken({
      userId,
      role: "ORG_ADMIN",
      organizationId: orgId,
    });
    const analystToken = signAccessToken({
      userId: new mongoose.Types.ObjectId().toString(),
      role: "SECURITY_ANALYST",
      organizationId: orgId,
    });

    // 1. Create 3 distinct endpoints for the multi-agent test setup
    const ep1 = await EndpointModel.create({
      organizationId: orgId,
      name: `TEST-EP-1-REAL-${Date.now()}`,
      status: "ONLINE",
      activationTokenHash: "dummy_hash_1",
      lastCheckInAt: new Date(),
    });
    const ep2 = await EndpointModel.create({
      organizationId: orgId,
      name: `TEST-EP-2-SIM-${Date.now()}`,
      status: "ONLINE",
      activationTokenHash: "dummy_hash_2",
      lastCheckInAt: new Date(),
    });
    const ep3 = await EndpointModel.create({
      organizationId: orgId,
      name: `TEST-EP-3-RANSOM-SIM-${Date.now()}`,
      status: "ONLINE",
      activationTokenHash: "dummy_hash_3",
      lastCheckInAt: new Date(),
    });

    console.log("1. Verifying initial state: All 3 endpoints are ONLINE...");
    assert.strictEqual(ep1.status, "ONLINE");
    assert.strictEqual(ep2.status, "ONLINE");
    assert.strictEqual(ep3.status, "ONLINE");
    console.log("  PASS: Endpoints 1, 2, 3 are initially ONLINE");

    console.log("2. Simulating ransomware detection on Endpoint 3 -> AT_RISK...");
    const detRes = await fetch(`${baseUrl}/api/detections/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({
        organizationId: orgId,
        endpointId: ep3._id.toString(),
        riskScore: 92,
        indicators: [
          {
            type: "PROCESS_ANOMALY",
            description: "Simulated ransomware encryptor detected",
            observedAt: new Date().toISOString(),
          },
        ],
      }),
    });
    assert.strictEqual(detRes.status, 201, "Expected 201 for detection ingestion");
    const detData = await detRes.json();
    const updatedEp3AfterDet = await EndpointModel.findById(ep3._id);
    assert.strictEqual(updatedEp3AfterDet?.status, "AT_RISK", "Endpoint 3 must be AT_RISK");
    console.log("  PASS: Endpoint 3 transitioned to AT_RISK after detection");

    console.log("3. Testing unauthorized isolation attempt (no token)...");
    const unauthRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/isolate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Unauthorized attempt" }),
    });
    assert.strictEqual(unauthRes.status, 401, "Expected 401 Unauthorized");
    console.log("  PASS: 401 returned for unauthenticated isolation attempt");

    console.log("4. Isolating Endpoint 3 by Security Analyst...");
    const isolateRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/isolate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${analystToken}`,
      },
      body: JSON.stringify({ reason: "High confidence ransomware detection mitigation" }),
    });
    assert.strictEqual(isolateRes.status, 200, "Expected 200 OK for isolation");
    const isolateData = await isolateRes.json();
    assert.strictEqual(isolateData.endpoint.status, "ISOLATED", "Endpoint status in response must be ISOLATED");
    assert.strictEqual(isolateData.action.actionType, "ISOLATE", "Action type must be ISOLATE");
    assert.strictEqual(isolateData.action.status, "PENDING", "Action status must be PENDING");

    const ep3Db = await EndpointModel.findById(ep3._id);
    assert.strictEqual(ep3Db?.status, "ISOLATED", "Database status must be ISOLATED");
    console.log("  PASS: Endpoint 3 successfully placed in ISOLATED state");

    console.log("5. Verifying Multi-Agent Isolation Scoping: Endpoints 1 and 2 are UNAFFECTED...");
    const ep1Db = await EndpointModel.findById(ep1._id);
    const ep2Db = await EndpointModel.findById(ep2._id);
    assert.strictEqual(ep1Db?.status, "ONLINE", "Endpoint 1 must remain ONLINE");
    assert.strictEqual(ep2Db?.status, "ONLINE", "Endpoint 2 must remain ONLINE");
    console.log("  PASS: Endpoints 1 and 2 remain ONLINE and unaffected by Endpoint 3's isolation");

    console.log("6. Testing Endpoint 3 Heartbeat: command delivery & preserving ISOLATED state...");
    const ep3HeartbeatRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 20, ramUsagePercent: 40, diskUsagePercent: 30 }),
    });
    assert.strictEqual(ep3HeartbeatRes.status, 200);
    const ep3HbData = await ep3HeartbeatRes.json();
    assert.strictEqual(ep3HbData.status, "ISOLATED", "Heartbeat must NOT overwrite ISOLATED back to ONLINE");
    assert.strictEqual(ep3HbData.pendingActions.length, 1, "Must return the pending ISOLATE action");
    assert.strictEqual(ep3HbData.pendingActions[0].actionType, "ISOLATE");
    assert.strictEqual(ep3HbData.pendingActions[0].endpointId, ep3._id.toString());
    const actionId = ep3HbData.pendingActions[0].actionId;
    console.log("  PASS: Heartbeat preserved ISOLATED status and returned scoped pending action");

    console.log("7. Testing Endpoint 1 and 2 Heartbeats: receive NO pending actions...");
    const ep1HbRes = await fetch(`${baseUrl}/api/endpoints/${ep1._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 15, ramUsagePercent: 35, diskUsagePercent: 25 }),
    });
    const ep1HbData = await ep1HbRes.json();
    assert.strictEqual(ep1HbData.status, "ONLINE");
    assert.strictEqual(ep1HbData.pendingActions.length, 0, "Endpoint 1 must receive zero pending actions");
    console.log("  PASS: Endpoint 1 receives no isolation commands");

    console.log("8. Testing Agent Acknowledgment of Action Execution...");
    const ackRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/actions/${actionId}/ack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ status: "ACKNOWLEDGED" }),
    });
    assert.strictEqual(ackRes.status, 200, "Expected 200 for action ACK");
    const ackData = await ackRes.json();
    assert.strictEqual(ackData.action.status, "ACKNOWLEDGED");
    const actionDb = await EndpointActionModel.findById(actionId);
    assert.strictEqual(actionDb?.status, "ACKNOWLEDGED");
    console.log("  PASS: Action status successfully updated to ACKNOWLEDGED");

    console.log("9. Testing Detection Resolution while Endpoint is ISOLATED...");
    const resolveRes = await fetch(`${baseUrl}/api/detections/${detData.detection._id}/resolve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${analystToken}`,
      },
      body: JSON.stringify({ outcome: "RESOLVED" }),
    });
    assert.strictEqual(resolveRes.status, 200);
    const ep3AfterResolve = await EndpointModel.findById(ep3._id);
    assert.strictEqual(
      ep3AfterResolve?.status,
      "ISOLATED",
      "Resolving detection must NOT revert ISOLATED status to ONLINE"
    );
    console.log("  PASS: Endpoint 3 status remains ISOLATED after detection resolution");

    console.log("10. Testing Release Isolation (Unisolate)...");
    const unisolateRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/unisolate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert.strictEqual(unisolateRes.status, 200);
    const ep3AfterUnisolate = await EndpointModel.findById(ep3._id);
    assert.strictEqual(ep3AfterUnisolate?.status, "ONLINE", "Endpoint 3 must be ONLINE after unisolating");
    console.log("  PASS: Endpoint 3 successfully unisolated and restored to ONLINE");

    console.log("11. Verifying Action History query...");
    const historyRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/actions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(historyRes.status, 200);
    const historyData = await historyRes.json();
    assert.strictEqual(historyData.actions.length, 2, "Should have ISOLATE and UNISOLATE action records");
    console.log("  PASS: Action history retrieved with all audit records");

    console.log("\n=== ALL BACKEND ISOLATION & RESPONSE TESTS PASSED! ===");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
