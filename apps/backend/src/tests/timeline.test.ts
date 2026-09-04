import assert from "node:assert";
import { createApp } from "../app";
import { Server } from "node:http";
import { env } from "../config/env";
import { connectDatabase } from "../config/database";
import mongoose from "mongoose";
import { EndpointModel } from "../models/endpoint.model";
import { DetectionModel } from "../models/detection.model";
import { EndpointActionModel } from "../models/endpointAction.model";
import { TimelineEventModel } from "../models/timelineEvent.model";
import { UserModel } from "../models/user.model";
import { signAccessToken } from "../utils/jwt";

async function runTests() {
  console.log("=== Starting Response Action Timeline & Audit Trail Tests ===");

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

    // Create test analyst in Org A
    const analystUser = await UserModel.create({
      organizationId: orgA,
      name: "Naajis Analyst",
      email: `analyst-${Date.now()}@sentineliq.ai`,
      passwordHash: "dummyhash",
      role: "SECURITY_ANALYST",
    });

    const adminUser = await UserModel.create({
      organizationId: orgA,
      name: "Admin Alice",
      email: `admin-${Date.now()}@sentineliq.ai`,
      passwordHash: "dummyhash",
      role: "ORG_ADMIN",
    });

    const orgBUser = await UserModel.create({
      organizationId: orgB,
      name: "Mallory Attacker",
      email: `mallory-${Date.now()}@competitor.com`,
      passwordHash: "dummyhash",
      role: "ORG_ADMIN",
    });

    const tokenAnalystA = signAccessToken({
      userId: analystUser._id.toString(),
      role: analystUser.role,
      organizationId: orgA,
    });

    const tokenAdminA = signAccessToken({
      userId: adminUser._id.toString(),
      role: adminUser.role,
      organizationId: orgA,
    });

    const tokenOrgB = signAccessToken({
      userId: orgBUser._id.toString(),
      role: orgBUser.role,
      organizationId: orgB,
    });

    // Create 3 distinct endpoints for multi-agent validation
    const ep1 = await EndpointModel.create({
      organizationId: orgA,
      name: `TEST-EP-1-NORMAL-${Date.now()}`,
      status: "ONLINE",
      activationTokenHash: "dummy_1",
      lastCheckInAt: new Date(),
    });

    const ep2 = await EndpointModel.create({
      organizationId: orgA,
      name: `TEST-EP-2-BENIGN-${Date.now()}`,
      status: "ONLINE",
      activationTokenHash: "dummy_2",
      lastCheckInAt: new Date(),
    });

    const ep3 = await EndpointModel.create({
      organizationId: orgA,
      name: `TEST-EP-3-RANSOM-${Date.now()}`,
      status: "ONLINE",
      activationTokenHash: "dummy_3",
      lastCheckInAt: new Date(),
    });

    console.log("1. Testing unauthorized timeline retrieval (no token -> 401)...");
    const unauthRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/timeline`);
    assert.strictEqual(unauthRes.status, 401, "Expected 401 Unauthorized for missing token");
    console.log("  PASS: 401 Unauthorized returned for unauthenticated request");

    console.log("2. Testing empty timeline state for newly created Endpoint 3...");
    const emptyRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    assert.strictEqual(emptyRes.status, 200);
    const emptyData = await emptyRes.json();
    assert.strictEqual(emptyData.events.length, 0, "Initial timeline must be empty");
    console.log("  PASS: Empty timeline verified with zero synthetic events");

    console.log("3. Ingesting detection on Endpoint 3 (score 98) -> recording DETECTION_CREATED & ENDPOINT_STATUS_CHANGED...");
    const detRes = await fetch(`${baseUrl}/api/detections/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({
        organizationId: orgA,
        endpointId: ep3._id.toString(),
        riskScore: 98,
        indicators: [
          {
            type: "FILE_ENCRYPTION_BURST",
            description: "Mass encryption observed in C:\\Users\\Administrator\\Documents",
            observedAt: new Date().toISOString(),
          },
        ],
      }),
    });
    assert.strictEqual(detRes.status, 201);
    const detData = await detRes.json();
    const detectionId = detData.detection._id;

    // Check timeline for Endpoint 3
    const timelineAfterDet = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    assert.strictEqual(timelineAfterDet.status, 200);
    const tData1 = await timelineAfterDet.json();
    assert.strictEqual(tData1.events.length, 2, "Expected 2 timeline events (DETECTION_CREATED + STATUS_CHANGED)");

    const detEvent = tData1.events.find((e: any) => e.eventType === "DETECTION_CREATED");
    assert.ok(detEvent, "DETECTION_CREATED event must exist");
    assert.strictEqual(detEvent.actorType, "AGENT", "Detection actor must be AGENT");
    assert.strictEqual(detEvent.detectionId, detectionId);
    assert.strictEqual(detEvent.metadata.riskScore, 98);

    const statusEvent1 = tData1.events.find((e: any) => e.eventType === "ENDPOINT_STATUS_CHANGED");
    assert.ok(statusEvent1, "ENDPOINT_STATUS_CHANGED event must exist");
    assert.strictEqual(statusEvent1.actorType, "SYSTEM");
    assert.strictEqual(statusEvent1.metadata.to, "AT_RISK");
    console.log("  PASS: Detection created & status change events recorded automatically");

    console.log("4. Verifying Multi-Agent Isolation: Endpoints 1 and 2 received zero events...");
    const ep1TimelineRes = await fetch(`${baseUrl}/api/endpoints/${ep1._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    const ep2TimelineRes = await fetch(`${baseUrl}/api/endpoints/${ep2._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    assert.strictEqual((await ep1TimelineRes.json()).events.length, 0);
    assert.strictEqual((await ep2TimelineRes.json()).events.length, 0);
    console.log("  PASS: Multi-agent scoping verified (Endpoints 1 and 2 timelines unaffected)");

    console.log("5. Testing Security Analyst isolation request -> ISOLATION_REQUESTED event...");
    const isolateRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/isolate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAnalystA}`,
      },
      body: JSON.stringify({ reason: "Active ransomware burst containment" }),
    });
    assert.strictEqual(isolateRes.status, 200);
    const isolateData = await isolateRes.json();
    const actionId = isolateData.action._id;

    const timelineAfterIsolate = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    const tData2 = await timelineAfterIsolate.json();
    const isolateReqEvent = tData2.events.find((e: any) => e.eventType === "ISOLATION_REQUESTED");
    assert.ok(isolateReqEvent, "ISOLATION_REQUESTED event must exist");
    assert.strictEqual(isolateReqEvent.actorType, "SECURITY_ANALYST", "Actor must be SECURITY_ANALYST");
    assert.strictEqual(isolateReqEvent.actorName, "Naajis Analyst");
    assert.strictEqual(isolateReqEvent.actionId, actionId);
    console.log("  PASS: Human analyst actor attributed cleanly on ISOLATION_REQUESTED");

    console.log("6. Simulating Endpoint Heartbeat -> command dispatched -> ISOLATION_SENT event...");
    const hbRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 25, ramUsagePercent: 45 }),
    });
    assert.strictEqual(hbRes.status, 200);

    const timelineAfterHb = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    const tData3 = await timelineAfterHb.json();
    const isolateSentEvent = tData3.events.find((e: any) => e.eventType === "ISOLATION_SENT");
    assert.ok(isolateSentEvent, "ISOLATION_SENT event must exist");
    assert.strictEqual(isolateSentEvent.actorType, "SYSTEM");
    console.log("  PASS: ISOLATION_SENT event recorded on command dispatch");

    console.log("7. Simulating Agent ACK -> ISOLATION_ACKNOWLEDGED event...");
    const ackRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/actions/${actionId}/ack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ status: "ACKNOWLEDGED" }),
    });
    assert.strictEqual(ackRes.status, 200);

    const timelineAfterAck = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    const tData4 = await timelineAfterAck.json();
    const ackEvent = tData4.events.find((e: any) => e.eventType === "ISOLATION_ACKNOWLEDGED");
    assert.ok(ackEvent, "ISOLATION_ACKNOWLEDGED event must exist");
    assert.strictEqual(ackEvent.actorType, "AGENT");
    assert.strictEqual(ackEvent.actorName, ep3.name);
    console.log("  PASS: Agent ACK event recorded with AGENT actor attribution");

    console.log("8. Testing Detection Resolution -> DETECTION_RESOLVED event...");
    const resolveRes = await fetch(`${baseUrl}/api/detections/${detectionId}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAnalystA}`,
      },
      body: JSON.stringify({ outcome: "RESOLVED" }),
    });
    assert.strictEqual(resolveRes.status, 200);

    const timelineAfterResolve = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    const tData5 = await timelineAfterResolve.json();
    const resolveEvent = tData5.events.find((e: any) => e.eventType === "DETECTION_RESOLVED");
    assert.ok(resolveEvent, "DETECTION_RESOLVED event must exist");
    assert.strictEqual(resolveEvent.actorType, "SECURITY_ANALYST");
    assert.strictEqual(resolveEvent.actorName, "Naajis Analyst");
    console.log("  PASS: Detection resolution recorded in timeline");

    console.log("9. Testing Release Isolation (Unisolate) -> UNISOLATION_REQUESTED & ENDPOINT_STATUS_CHANGED...");
    const unisolateRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/unisolate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdminA}`,
      },
    });
    assert.strictEqual(unisolateRes.status, 200);
    const unisolateActionId = (await unisolateRes.json()).action._id;

    // Agent heartbeats and receives unisolate command
    await fetch(`${baseUrl}/api/endpoints/${ep3._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 12 }),
    });

    // Agent acks unisolation
    await fetch(`${baseUrl}/api/endpoints/${ep3._id}/actions/${unisolateActionId}/ack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ status: "ACKNOWLEDGED" }),
    });

    const finalTimelineRes = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    const finalTimeline = await finalTimelineRes.json();

    assert.ok(finalTimeline.events.some((e: any) => e.eventType === "UNISOLATION_REQUESTED"));
    assert.ok(finalTimeline.events.some((e: any) => e.eventType === "UNISOLATION_SENT"));
    assert.ok(finalTimeline.events.some((e: any) => e.eventType === "UNISOLATION_ACKNOWLEDGED"));
    assert.ok(finalTimeline.events.some((e: any) => e.eventType === "ENDPOINT_STATUS_CHANGED" && e.metadata.to === "ONLINE"));

    console.log("  PASS: Full unisolation lifecycle captured in chronological timeline");

    console.log("10. Testing Chronological Ordering...");
    for (let i = 0; i < finalTimeline.events.length - 1; i++) {
      const t1 = new Date(finalTimeline.events[i].timestamp).getTime();
      const t2 = new Date(finalTimeline.events[i + 1].timestamp).getTime();
      assert.ok(t1 <= t2, `Event ${i} must precede event ${i + 1}`);
    }
    console.log("  PASS: Chronological order (oldest to newest) verified");

    console.log("11. Testing Detection Timeline Endpoint (GET /api/detections/:id/timeline)...");
    const detTimelineRes = await fetch(`${baseUrl}/api/detections/${detectionId}/timeline`, {
      headers: { Authorization: `Bearer ${tokenAnalystA}` },
    });
    assert.strictEqual(detTimelineRes.status, 200);
    const detTimelineData = await detTimelineRes.json();
    assert.ok(detTimelineData.events.length >= 2, "Detection timeline must contain incident events");
    console.log("  PASS: Detection-scoped timeline retrieved successfully");

    console.log("12. Testing Cross-Organization Scoping (Org B user cannot view Org A timeline -> 404)...");
    const crossOrgTimeline = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/timeline`, {
      headers: { Authorization: `Bearer ${tokenOrgB}` },
    });
    assert.strictEqual(crossOrgTimeline.status, 404, "Cross-org endpoint timeline request must return 404");

    const crossOrgDetTimeline = await fetch(`${baseUrl}/api/detections/${detectionId}/timeline`, {
      headers: { Authorization: `Bearer ${tokenOrgB}` },
    });
    assert.strictEqual(crossOrgDetTimeline.status, 404, "Cross-org detection timeline request must return 404");
    console.log("  PASS: Tenant isolation strictly enforced (404 for other org's endpoints/detections)");

    console.log("\n=== ALL RESPONSE TIMELINE TESTS PASSED! ===");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
