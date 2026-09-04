import assert from "node:assert";
import { createApp } from "../app";
import { Server } from "node:http";
import { env } from "../config/env";
import { connectDatabase } from "../config/database";
import mongoose from "mongoose";
import { EndpointModel } from "../models/endpoint.model";
import { DetectionModel } from "../models/detection.model";
import { signAccessToken } from "../utils/jwt";

async function runTests() {
  console.log("=== Starting Detection Resolution Workflow Tests ===");

  await connectDatabase();
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const orgA = new mongoose.Types.ObjectId().toString();
    const orgB = new mongoose.Types.ObjectId().toString();
    const userAdminA = new mongoose.Types.ObjectId().toString();
    const userAnalystA = new mongoose.Types.ObjectId().toString();
    const userAdminB = new mongoose.Types.ObjectId().toString();

    const tokenAdminA = signAccessToken({
      userId: userAdminA,
      role: "ORG_ADMIN",
      organizationId: orgA,
    });
    const tokenAnalystA = signAccessToken({
      userId: userAnalystA,
      role: "SECURITY_ANALYST",
      organizationId: orgA,
    });
    const tokenAdminB = signAccessToken({
      userId: userAdminB,
      role: "ORG_ADMIN",
      organizationId: orgB,
    });
    const tokenInvalidRole = signAccessToken({
      userId: new mongoose.Types.ObjectId().toString(),
      role: "READ_ONLY_VIEWER",
      organizationId: orgA,
    });

    // Create test endpoints
    const epA1 = await EndpointModel.create({
      organizationId: orgA,
      name: `TEST-WORKSTATION-05-${Date.now()}`,
      status: "ONLINE",
      activationTokenHash: "dummy_hash_a1",
      lastCheckInAt: new Date(),
    });

    const epA2 = await EndpointModel.create({
      organizationId: orgA,
      name: `TEST-WORKSTATION-06-MULTI-${Date.now()}`,
      status: "ONLINE",
      activationTokenHash: "dummy_hash_a2",
      lastCheckInAt: new Date(),
    });

    console.log("1. Ingesting detection on WORKSTATION-05 (score 98) -> transitions to AT_RISK...");
    const ingestRes1 = await fetch(`${baseUrl}/api/detections/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({
        organizationId: orgA,
        endpointId: epA1._id.toString(),
        riskScore: 98,
        indicators: [
          {
            type: "FILE_ENCRYPTION_BURST",
            description: "Rapid mass encryption observed in Documents",
            observedAt: new Date().toISOString(),
          },
        ],
      }),
    });
    assert.strictEqual(ingestRes1.status, 201, "Expected 201 for ingestion");
    const det1 = (await ingestRes1.json()).detection;
    assert.strictEqual(det1.status, "NEW");
    assert.strictEqual(det1.riskScore, 98);
    assert.strictEqual(det1.severity, "CRITICAL");

    const epA1AfterDet = await EndpointModel.findById(epA1._id);
    assert.strictEqual(epA1AfterDet?.status, "AT_RISK", "Endpoint WORKSTATION-05 must be AT_RISK");
    console.log("  PASS: Ingested detection recorded and endpoint transitioned to AT_RISK");

    console.log("2. Testing unauthorized resolve attempts (no token -> 401, unauthorized role -> 403)...");
    const noTokenRes = await fetch(`${baseUrl}/api/detections/${det1._id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: "RESOLVED" }),
    });
    assert.strictEqual(noTokenRes.status, 401, "Expected 401 for missing token");

    const patchNoTokenRes = await fetch(`${baseUrl}/api/detections/${det1._id}/resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: "RESOLVED" }),
    });
    assert.strictEqual(patchNoTokenRes.status, 401, "Expected 401 for PATCH without token");

    const invalidRoleRes = await fetch(`${baseUrl}/api/detections/${det1._id}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenInvalidRole}`,
      },
      body: JSON.stringify({ outcome: "RESOLVED" }),
    });
    assert.strictEqual(invalidRoleRes.status, 403, "Expected 403 for unauthorized role");
    console.log("  PASS: 401 and 403 enforced on resolve endpoints");

    console.log("3. Testing organization scoping (User from Org B cannot resolve Org A detection)...");
    const crossOrgRes = await fetch(`${baseUrl}/api/detections/${det1._id}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdminB}`,
      },
      body: JSON.stringify({ outcome: "RESOLVED" }),
    });
    assert.strictEqual(crossOrgRes.status, 404, "Expected 404 when resolving detection belonging to another organization");
    console.log("  PASS: Cross-org resolution is forbidden (404)");

    console.log("4. Testing POST /api/detections/:id/resolve by Security Analyst...");
    const resolvePostRes = await fetch(`${baseUrl}/api/detections/${det1._id}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAnalystA}`,
      },
      body: JSON.stringify({}), // empty body -> defaults to RESOLVED
    });
    assert.strictEqual(resolvePostRes.status, 200, "Expected 200 for POST resolve");
    const resolvePostData = await resolvePostRes.json();
    assert.strictEqual(resolvePostData.detection.status, "RESOLVED");
    assert.ok(resolvePostData.detection.resolvedAt, "resolvedAt must be set");
    assert.strictEqual(resolvePostData.detection.resolvedByUserId, userAnalystA, "resolvedByUserId must match analyst user");

    // Verify detection in DB is preserved (not deleted)
    const det1Db = await DetectionModel.findById(det1._id);
    assert.ok(det1Db, "Detection record must be preserved in database");
    assert.strictEqual(det1Db.status, "RESOLVED");
    assert.ok(det1Db.resolvedAt);
    assert.strictEqual(det1Db.resolvedByUserId?.toString(), userAnalystA);

    // Verify endpoint WORKSTATION-05 is restored to ONLINE
    const epA1AfterResolve = await EndpointModel.findById(epA1._id);
    assert.strictEqual(epA1AfterResolve?.status, "ONLINE", "WORKSTATION-05 must become ONLINE after resolution");
    console.log("  PASS: Detection resolved via POST, record preserved, endpoint restored to ONLINE");

    console.log("5. Testing resolving an already-resolved detection (idempotent behavior)...");
    const reResolveRes = await fetch(`${baseUrl}/api/detections/${det1._id}/resolve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdminA}`,
      },
      body: JSON.stringify({ outcome: "RESOLVED" }),
    });
    assert.strictEqual(reResolveRes.status, 200, "Expected 200 for re-resolving already resolved detection");
    const reResolveData = await reResolveRes.json();
    assert.strictEqual(reResolveData.detection.status, "RESOLVED");
    console.log("  PASS: Re-resolving already-resolved detection succeeds cleanly");

    console.log("6. Testing multi-detection scenario on Endpoint 2 (AT_RISK until LAST detection resolved)...");
    // Ingest detection 2A
    const ingestRes2A = await fetch(`${baseUrl}/api/detections/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({
        organizationId: orgA,
        endpointId: epA2._id.toString(),
        riskScore: 75,
        indicators: ["Suspicious shadow copy deletion"],
      }),
    });
    const det2A = (await ingestRes2A.json()).detection;

    // Ingest detection 2B
    const ingestRes2B = await fetch(`${baseUrl}/api/detections/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({
        organizationId: orgA,
        endpointId: epA2._id.toString(),
        riskScore: 88,
        indicators: ["High entropy file writes in System32"],
      }),
    });
    const det2B = (await ingestRes2B.json()).detection;

    const epA2Initial = await EndpointModel.findById(epA2._id);
    assert.strictEqual(epA2Initial?.status, "AT_RISK");

    // Resolve detection 2A only -> endpoint must STAY AT_RISK because 2B is still active
    const res2A = await fetch(`${baseUrl}/api/detections/${det2A._id}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdminA}`,
      },
      body: JSON.stringify({ outcome: "RESOLVED" }),
    });
    assert.strictEqual(res2A.status, 200);

    const epA2Middle = await EndpointModel.findById(epA2._id);
    assert.strictEqual(epA2Middle?.status, "AT_RISK", "Endpoint must stay AT_RISK when another active detection remains");
    console.log("  PASS: Endpoint remains AT_RISK when 1 of 2 detections is resolved");

    // Heartbeat during active detection -> must stay AT_RISK
    const hbWhileAtRisk = await fetch(`${baseUrl}/api/endpoints/${epA2._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 10 }),
    });
    const hbAtRiskData = await hbWhileAtRisk.json();
    assert.strictEqual(hbAtRiskData.status, "AT_RISK", "Heartbeat must return AT_RISK when active detections remain");

    // Resolve detection 2B as FALSE_POSITIVE -> endpoint must become ONLINE
    const res2B = await fetch(`${baseUrl}/api/detections/${det2B._id}/resolve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAnalystA}`,
      },
      body: JSON.stringify({ outcome: "FALSE_POSITIVE" }),
    });
    assert.strictEqual(res2B.status, 200);

    const epA2Final = await EndpointModel.findById(epA2._id);
    assert.strictEqual(epA2Final?.status, "ONLINE", "Endpoint must become ONLINE when all detections resolved");
    console.log("  PASS: Endpoint transitioned to ONLINE after all active detections resolved");

    console.log("7. Testing Heartbeat recovery to ONLINE when endpoint was AT_RISK and detections resolved...");
    // Manually set epA1 to AT_RISK to test heartbeat auto-recovery
    await EndpointModel.updateOne({ _id: epA1._id }, { status: "AT_RISK" });
    const hbRecoveryRes = await fetch(`${baseUrl}/api/endpoints/${epA1._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 15, ramUsagePercent: 30, diskUsagePercent: 20 }),
    });
    assert.strictEqual(hbRecoveryRes.status, 200);
    const hbRecoveryData = await hbRecoveryRes.json();
    assert.strictEqual(hbRecoveryData.status, "ONLINE", "Heartbeat must evaluate that no active detections exist and restore ONLINE status");
    console.log("  PASS: Heartbeat correctly recovers endpoint to ONLINE when no active detections exist");

    console.log("\n=== ALL DETECTION RESOLUTION TESTS PASSED! ===");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
