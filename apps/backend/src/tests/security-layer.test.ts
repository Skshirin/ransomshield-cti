import assert from "node:assert";
import { Server } from "node:http";
import mongoose from "mongoose";
import { createApp } from "../app";
import { connectDatabase } from "../config/database";
import { OrganizationModel } from "../models/organization.model";
import { UserModel } from "../models/user.model";
import { EndpointModel } from "../models/endpoint.model";
import { DetectionModel } from "../models/detection.model";
import { PolicyModel } from "../models/policy.model";
import { CascadeModel } from "../models/cascade.model";
import { TimelineEventModel } from "../models/timelineEvent.model";
import { EndpointActionModel } from "../models/endpointAction.model";
import { signAccessToken } from "../utils/jwt";
import { env } from "../config/env";
import { threatIntelService } from "../services/cti/threatIntel.service";

async function runTests() {
  console.log("=== Starting Next-Gen Security Layer Integration Tests ===");
  await connectDatabase();

  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Setup Test Organizations, Users, and Endpoints
    const orgA = await OrganizationModel.create({ name: "Security Layer Test Org A" });
    const orgAId = orgA._id.toString();

    const orgB = await OrganizationModel.create({ name: "Security Layer Test Org B" });
    const orgBId = orgB._id.toString();

    const adminA = await UserModel.create({
      organizationId: orgA._id,
      name: "Admin User",
      email: `admin-sec-${Date.now()}@orga.com`,
      passwordHash: "dummyhash",
      role: "ORG_ADMIN",
    });
    const adminTokenA = signAccessToken({
      userId: adminA._id.toString(),
      organizationId: orgAId,
      role: "ORG_ADMIN",
    });

    const analystA = await UserModel.create({
      organizationId: orgA._id,
      name: "Analyst Alice",
      email: `analyst-sec-${Date.now()}@orga.com`,
      passwordHash: "dummyhash",
      role: "SECURITY_ANALYST",
    });
    const analystTokenA = signAccessToken({
      userId: analystA._id.toString(),
      organizationId: orgAId,
      role: "SECURITY_ANALYST",
    });

    const viewerTokenA = signAccessToken({
      userId: new mongoose.Types.ObjectId().toString(),
      organizationId: orgAId,
      role: "READONLY_USER",
    });

    const analystB = await UserModel.create({
      organizationId: orgB._id,
      name: "Analyst Bob (Org B)",
      email: `analyst-sec-${Date.now()}@orgb.com`,
      passwordHash: "dummyhash",
      role: "SECURITY_ANALYST",
    });
    const analystTokenB = signAccessToken({
      userId: analystB._id.toString(),
      organizationId: orgBId,
      role: "SECURITY_ANALYST",
    });

    const epA1 = await EndpointModel.create({
      organizationId: orgA._id,
      name: "WORKSTATION-A01",
      status: "ONLINE",
      activationTokenHash: "dummyhashA1",
      apiKeyHash: "dummyApiKeyA1",
    });
    const endpointA1Id = epA1._id.toString();

    const epA2 = await EndpointModel.create({
      organizationId: orgA._id,
      name: "WORKSTATION-A02",
      status: "ONLINE",
      activationTokenHash: "dummyhashA2",
      apiKeyHash: "dummyApiKeyA2",
    });
    const endpointA2Id = epA2._id.toString();

    const epA3 = await EndpointModel.create({
      organizationId: orgA._id,
      name: "WORKSTATION-A03",
      status: "ONLINE",
      activationTokenHash: "dummyhashA3",
      apiKeyHash: "dummyApiKeyA3",
    });
    const endpointA3Id = epA3._id.toString();

    const epB1 = await EndpointModel.create({
      organizationId: orgB._id,
      name: "WORKSTATION-B01",
      status: "ONLINE",
      activationTokenHash: "dummyhashB1",
      apiKeyHash: "dummyApiKeyB1",
    });
    const endpointB1Id = epB1._id.toString();

    console.log("1. Testing Threat Intelligence Lookups & Extensible Provider...");
    const domainLookup = await threatIntelService.lookupIndicator("malicious.example.com");
    assert.equal(domainLookup.matched, true, "Known domain must match");
    assert.equal(domainLookup.isMalicious, true);
    assert.equal(domainLookup.severity, "CRITICAL");
    assert.equal(domainLookup.threatCategory, "Ransomware C2");

    const ipLookup = await threatIntelService.lookupIndicator("198.51.100.23");
    assert.equal(ipLookup.matched, true, "Known IP must match");
    assert.equal(ipLookup.type, "IP");

    const hashLookup = await threatIntelService.lookupIndicator(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    assert.equal(hashLookup.matched, true, "Known hash must match");
    assert.equal(hashLookup.type, "HASH");

    const cleanLookup = await threatIntelService.lookupIndicator("clean-corp-server.internal");
    assert.equal(cleanLookup.matched, false, "Unknown domain must return matched=false");
    console.log("  PASS: Threat Intelligence provider lookups verified");

    console.log("2. Testing Threat Intel API Routes...");
    const resIocs = await fetch(`${baseUrl}/api/threat-intel/iocs`, {
      headers: { Authorization: `Bearer ${analystTokenA}` },
    });
    assert.equal(resIocs.status, 200);
    const iocsData = (await resIocs.json()) as any;
    assert.ok(iocsData.iocs.length > 0);

    const resLookup = await fetch(`${baseUrl}/api/threat-intel/lookup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${analystTokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ indicator: "malicious.example.com" }),
    });
    assert.equal(resLookup.status, 200);
    const lookupData = (await resLookup.json()) as any;
    assert.equal(lookupData.result.matched, true);

    const resStats = await fetch(`${baseUrl}/api/threat-intel/stats`, {
      headers: { Authorization: `Bearer ${analystTokenA}` },
    });
    assert.equal(resStats.status, 200);
    const statsData = (await resStats.json()) as any;
    assert.ok(statsData.totalIOCs >= 7);
    console.log("  PASS: Threat Intel API routes return authentic datasets");

    console.log("3. Testing Policy Management CRUD & RBAC...");
    // Viewer should be forbidden from creating policies (403)
    const resViewerCreate = await fetch(`${baseUrl}/api/policies`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${viewerTokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Viewer Policy",
        conditions: [{ field: "riskScore", operator: "GREATER_THAN_OR_EQUAL", value: 90 }],
        actions: [{ type: "ISOLATE_ENDPOINT" }],
      }),
    });
    assert.equal(resViewerCreate.status, 403, "Viewer must receive 403 on policy creation");

    // Analyst creates Policy 1 (Score >= 80 AND CTI Match -> Isolate)
    const resCreatePolicy1 = await fetch(`${baseUrl}/api/policies`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${analystTokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Critical Ransomware & CTI Auto-Isolate",
        description: "Automatically isolate any endpoint with high risk score and verified CTI match",
        priority: 90,
        logicalOperator: "AND",
        conditions: [
          { field: "riskScore", operator: "GREATER_THAN_OR_EQUAL", value: 80 },
          { field: "ctiMatch", operator: "EQUALS", value: true },
        ],
        actions: [{ type: "ISOLATE_ENDPOINT" }],
        cooldownPeriodSeconds: 10,
      }),
    });
    assert.equal(resCreatePolicy1.status, 201);
    const policy1Data = (await resCreatePolicy1.json()) as any;
    const policy1Id = policy1Data.policy._id;

    // Admin creates Policy 2 (Cross-Endpoint Attack Detected -> Isolate)
    const resCreatePolicy2 = await fetch(`${baseUrl}/api/policies`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminTokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Cross-Endpoint Cascade Rapid Response",
        description: "Auto-isolate endpoints participating in a multi-host cascade",
        priority: 80,
        logicalOperator: "AND",
        conditions: [
          { field: "crossEndpointAttack", operator: "EQUALS", value: true },
          { field: "affectedEndpointCount", operator: "GREATER_THAN_OR_EQUAL", value: 2 },
        ],
        actions: [{ type: "ISOLATE_ENDPOINT" }],
        cooldownPeriodSeconds: 10,
      }),
    });
    assert.equal(resCreatePolicy2.status, 201);

    // List policies for Org A
    const resListA = await fetch(`${baseUrl}/api/policies`, {
      headers: { Authorization: `Bearer ${analystTokenA}` },
    });
    assert.equal(resListA.status, 200);
    const listAData = (await resListA.json()) as any;
    assert.equal(listAData.policies.length, 2);

    // Cross-tenant check: Org B must see 0 policies
    const resListB = await fetch(`${baseUrl}/api/policies`, {
      headers: { Authorization: `Bearer ${analystTokenB}` },
    });
    assert.equal(resListB.status, 200);
    const listBData = (await resListB.json()) as any;
    assert.equal(listBData.policies.length, 0, "Org B must not see Org A policies");
    console.log("  PASS: Policy CRUD and tenant scoping verified");

    console.log("4. Testing Ingestion with CTI Correlation on Endpoint A1...");
    // Ingest detection with indicator referencing malicious C2 domain
    const resIngest1 = await fetch(`${baseUrl}/api/detections/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({
        organizationId: orgAId,
        endpointId: endpointA1Id,
        riskScore: 88,
        indicators: [
          {
            type: "NETWORK_BEACON",
            description: "Process svchost.exe established connection to malicious.example.com",
            observedAt: new Date(),
          },
        ],
        modelVersion: "agent-v0.1",
      }),
    });
    assert.equal(resIngest1.status, 201);
    const ingest1Data = (await resIngest1.json()) as any;

    // Check that detection has ctiMatch populated
    const det1 = await DetectionModel.findById(ingest1Data.detection._id);
    assert.ok(det1?.ctiMatch?.matched, "Detection must have matched CTI");
    assert.equal(det1?.ctiMatch?.indicator, "malicious.example.com");
    assert.equal(det1?.ctiMatch?.threatCategory, "Ransomware C2");

    // Verify Policy 1 triggered on Endpoint A1 because riskScore >= 80 AND ctiMatch == true!
    const epA1Updated = await EndpointModel.findById(endpointA1Id);
    assert.equal(epA1Updated?.status, "ISOLATED", "Endpoint A1 must be automatically ISOLATED by policy");

    // Verify timeline events recorded with actorType: AUTOMATED_POLICY
    const timelineA1 = await TimelineEventModel.find({ endpointId: endpointA1Id }).sort({ timestamp: 1 });
    const policyEvent = timelineA1.find((e) => e.eventType === "POLICY_TRIGGERED");
    assert.ok(policyEvent, "Timeline must contain POLICY_TRIGGERED event");
    assert.equal(policyEvent?.actorType, "AUTOMATED_POLICY");
    assert.equal(policyEvent?.actorName, "Critical Ransomware & CTI Auto-Isolate");

    const ctiEvent = timelineA1.find((e) => e.eventType === "CTI_MATCHED");
    assert.ok(ctiEvent, "Timeline must contain CTI_MATCHED event");
    console.log("  PASS: CTI match and automated policy isolation verified on Endpoint A1");

    console.log("5. Testing Cross-Endpoint Attack / Cascade Detection on Endpoint A2...");
    // Ingest detection on Endpoint A2 5 seconds later with same C2 domain
    const resIngest2 = await fetch(`${baseUrl}/api/detections/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({
        organizationId: orgAId,
        endpointId: endpointA2Id,
        riskScore: 92,
        indicators: [
          {
            type: "PROCESS_INJECTION",
            description: "Suspicious lateral staging beaconing to malicious.example.com",
            observedAt: new Date(),
          },
        ],
        modelVersion: "agent-v0.1",
      }),
    });
    assert.equal(resIngest2.status, 201);

    // Check that a Cascade was created grouping Endpoint A1 and Endpoint A2
    const cascades = await CascadeModel.find({ organizationId: orgAId });
    assert.equal(cascades.length, 1, "Exactly one cross-endpoint cascade must be created");
    const cascade = cascades[0];
    assert.equal(cascade.status, "ACTIVE");
    assert.equal(cascade.affectedEndpointNames.length, 2);
    assert.ok(cascade.affectedEndpointNames.includes("WORKSTATION-A01"));
    assert.ok(cascade.affectedEndpointNames.includes("WORKSTATION-A02"));
    assert.ok(cascade.matchedIOCs.includes("malicious.example.com"));

    // Check Cascade API
    const resCascadeList = await fetch(`${baseUrl}/api/cascades`, {
      headers: { Authorization: `Bearer ${analystTokenA}` },
    });
    assert.equal(resCascadeList.status, 200);
    const cascadeListData = (await resCascadeList.json()) as any;
    assert.equal(cascadeListData.cascades.length, 1);
    assert.equal(cascadeListData.cascades[0].cascadeId, cascade.cascadeId);

    // Org B isolation: Org B must see 0 cascades
    const resCascadeListB = await fetch(`${baseUrl}/api/cascades`, {
      headers: { Authorization: `Bearer ${analystTokenB}` },
    });
    assert.equal(resCascadeListB.status, 200);
    const cascadeListBData = (await resCascadeListB.json()) as any;
    assert.equal(cascadeListBData.cascades.length, 0);
    console.log("  PASS: Cross-endpoint cascade detection and multi-tenant scoping verified");

    console.log("6. Testing Cascade Bulk Containment (Contain All Affected Endpoints)...");
    // Endpoint A3 gets added to cascade
    const resIngest3 = await fetch(`${baseUrl}/api/detections/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({
        organizationId: orgAId,
        endpointId: endpointA3Id,
        riskScore: 78,
        indicators: [
          {
            type: "RANSOMWARE_ENCRYPT",
            description: "Mass file rename burst matching beacon to malicious.example.com",
            observedAt: new Date(),
          },
        ],
        modelVersion: "agent-v0.1",
      }),
    });
    assert.equal(resIngest3.status, 201);

    // Contain cascade
    const resContain = await fetch(`${baseUrl}/api/cascades/${cascade.cascadeId}/contain`, {
      method: "POST",
      headers: { Authorization: `Bearer ${analystTokenA}` },
    });
    assert.equal(resContain.status, 200);
    const containData = (await resContain.json()) as any;
    assert.equal(containData.cascade.status, "CONTAINED");

    // All 3 endpoints must now be ISOLATED
    const finalEpA1 = await EndpointModel.findById(endpointA1Id);
    const finalEpA2 = await EndpointModel.findById(endpointA2Id);
    const finalEpA3 = await EndpointModel.findById(endpointA3Id);
    assert.equal(finalEpA1?.status, "ISOLATED");
    assert.equal(finalEpA2?.status, "ISOLATED");
    assert.equal(finalEpA3?.status, "ISOLATED");
    console.log("  PASS: Cascade bulk containment isolated all affected endpoints");

    console.log("7. Testing Endpoint Action Heartbeat & Agent ACK Lifecycle...");
    // Endpoint A3 receives pending isolation action on heartbeat
    const resHeartbeat = await fetch(`${baseUrl}/api/endpoints/${endpointA3Id}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.mlServiceApiKey,
      },
      body: JSON.stringify({
        cpuUsagePercent: 18.5,
        ramUsagePercent: 42.0,
        diskUsagePercent: 30.1,
      }),
    });
    assert.equal(resHeartbeat.status, 200);
    const heartbeatData = (await resHeartbeat.json()) as any;
    assert.equal(heartbeatData.status, "ISOLATED");
    assert.ok(heartbeatData.pendingActions.length > 0);
    const actionToAck = heartbeatData.pendingActions[0];

    // Agent posts ACK
    const resAck = await fetch(
      `${baseUrl}/api/endpoints/${endpointA3Id}/actions/${actionToAck.actionId}/ack`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.mlServiceApiKey,
        },
        body: JSON.stringify({ status: "ACKNOWLEDGED" }),
      }
    );
    assert.equal(resAck.status, 200);
    const ackData = (await resAck.json()) as any;
    assert.equal(ackData.action.status, "ACKNOWLEDGED");

    // Check timeline shows complete automated forensic audit trail
    const fullTimelineA3 = await TimelineEventModel.find({ endpointId: endpointA3Id }).sort({ timestamp: 1 });
    const eventTypes = fullTimelineA3.map((e) => e.eventType);
    assert.ok(eventTypes.includes("DETECTION_CREATED"));
    assert.ok(eventTypes.includes("CTI_MATCHED"));
    assert.ok(eventTypes.includes("CASCADE_DETECTED"));
    assert.ok(eventTypes.includes("ISOLATION_REQUESTED"));
    assert.ok(eventTypes.includes("ISOLATION_SENT"));
    assert.ok(eventTypes.includes("ISOLATION_ACKNOWLEDGED"));
    console.log("  PASS: Complete autonomous response lifecycle and timeline verification confirmed");

    console.log("\n=== ALL NEXT-GEN SECURITY LAYER TESTS PASSED! ===");
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
