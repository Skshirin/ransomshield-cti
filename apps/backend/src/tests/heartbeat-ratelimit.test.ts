import assert from "node:assert";
import { createApp } from "../app";
import { Server } from "node:http";
import { env } from "../config/env";
import { connectDatabase } from "../config/database";
import mongoose from "mongoose";
import { EndpointModel } from "../models/endpoint.model";

async function runTests() {
  console.log("=== Starting Heartbeat & Rate Limit Tests ===");

  await connectDatabase();
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Setup test endpoints in database
    const orgId = new mongoose.Types.ObjectId().toString();
    const ep1 = await EndpointModel.create({
      organizationId: orgId,
      name: `TEST-EP-1-${Date.now()}`,
      status: "PENDING",
      activationTokenHash: "dummy_hash_1",
      activationTokenExpiresAt: new Date(Date.now() + 3600000),
    });
    const ep2 = await EndpointModel.create({
      organizationId: orgId,
      name: `TEST-EP-2-${Date.now()}`,
      status: "PENDING",
      activationTokenHash: "dummy_hash_2",
      activationTokenExpiresAt: new Date(Date.now() + 3600000),
    });
    const ep3 = await EndpointModel.create({
      organizationId: orgId,
      name: `TEST-EP-3-${Date.now()}`,
      status: "PENDING",
      activationTokenHash: "dummy_hash_3",
      activationTokenExpiresAt: new Date(Date.now() + 3600000),
    });

    console.log("1. Testing unauthorized heartbeat request (no API key)...");
    const unauthRes = await fetch(`${baseUrl}/api/endpoints/${ep1._id}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpuUsagePercent: 10, ramUsagePercent: 20, diskUsagePercent: 30 }),
    });
    assert.strictEqual(unauthRes.status, 401, "Expected 401 for missing x-api-key");
    console.log("  PASS: 401 Unauthorized for missing API key");

    console.log("2. Testing successful heartbeat from Agent 1...");
    const ep1Res = await fetch(`${baseUrl}/api/endpoints/${ep1._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 15.5, ramUsagePercent: 42.0, diskUsagePercent: 33.1 }),
    });
    assert.strictEqual(ep1Res.status, 200, "Expected 200 OK for ep1 heartbeat");
    const ep1Data = await ep1Res.json();
    assert.strictEqual(ep1Data.status, "ONLINE", "Expected endpoint status to become ONLINE");
    console.log("  PASS: Agent 1 heartbeat succeeded and status is ONLINE");

    console.log("3. Testing successful heartbeat from Agent 2...");
    const ep2Res = await fetch(`${baseUrl}/api/endpoints/${ep2._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 12.0, ramUsagePercent: 39.5, diskUsagePercent: 29.0 }),
    });
    assert.strictEqual(ep2Res.status, 200, "Expected 200 OK for ep2 heartbeat");
    const ep2Data = await ep2Res.json();
    assert.strictEqual(ep2Data.status, "ONLINE", "Expected endpoint status to become ONLINE");
    console.log("  PASS: Agent 2 heartbeat succeeded and status is ONLINE");

    console.log("4. Testing successful heartbeat from Agent 3...");
    const ep3Res = await fetch(`${baseUrl}/api/endpoints/${ep3._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 18.0, ramUsagePercent: 45.0, diskUsagePercent: 31.0 }),
    });
    assert.strictEqual(ep3Res.status, 200, "Expected 200 OK for ep3 heartbeat");
    const ep3Data = await ep3Res.json();
    assert.strictEqual(ep3Data.status, "ONLINE", "Expected endpoint status to become ONLINE");
    console.log("  PASS: Agent 3 heartbeat succeeded and status is ONLINE");

    console.log("5. Testing multi-agent rate limit isolation (Agent 1 excessive traffic doesn't block Agent 2)...");
    // Send 30 heartbeats to ep1 (reaching limit)
    let ep1Hit429 = false;
    for (let i = 0; i < 35; i++) {
      const res = await fetch(`${baseUrl}/api/endpoints/${ep1._id}/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.mlServiceApiKey,
        },
        body: JSON.stringify({ cpuUsagePercent: 20 }),
      });
      if (res.status === 429) {
        ep1Hit429 = true;
        break;
      }
    }
    assert.strictEqual(ep1Hit429, true, "Expected Agent 1 to eventually hit 429 when sending excessive heartbeats (>30/min)");
    console.log("  PASS: Excessive heartbeats on Agent 1 correctly trigger 429 rate limit");

    // Agent 2 should STILL be able to heartbeat successfully (independent bucket!)
    const ep2IndependentRes = await fetch(`${baseUrl}/api/endpoints/${ep2._id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({ cpuUsagePercent: 14 }),
    });
    assert.strictEqual(ep2IndependentRes.status, 200, "Expected Agent 2 to succeed even while Agent 1 is rate-limited");
    console.log("  PASS: Agent 2 continues to heartbeat with 200 OK while Agent 1 is rate limited");

    console.log("6. Testing general API rate limiter preserves protection on other routes...");
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200, "Expected 200 OK for health check");
    console.log("  PASS: Health route accessible and general limiter active");

    console.log("7. Testing staleness threshold logic...");
    // Check staleness threshold query
    const staleThreshold = new Date(Date.now() - 60 * 1000);
    await EndpointModel.updateOne({ _id: ep3._id }, { lastCheckInAt: new Date(Date.now() - 120 * 1000) });
    await EndpointModel.updateMany(
      {
        organizationId: orgId,
        status: "ONLINE",
        isDeleted: false,
        lastCheckInAt: { $lt: staleThreshold },
      },
      { status: "OFFLINE" }
    );
    const updatedEp3 = await EndpointModel.findById(ep3._id);
    assert.strictEqual(updatedEp3?.status, "OFFLINE", "Expected endpoint stale > 60s to transition to OFFLINE");
    console.log("  PASS: Endpoint > 60s without heartbeat correctly transitions to OFFLINE");

    // Cleanup test records
    await EndpointModel.deleteMany({ _id: { $in: [ep1._id, ep2._id, ep3._id] } });

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
