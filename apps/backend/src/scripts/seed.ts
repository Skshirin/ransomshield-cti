/**
 * Wipes all collections and populates realistic demo data for viva/demo
 * purposes. Destructive by design - requires an explicit --confirm flag
 * so it can never run accidentally against a database you care about.
 *
 * Usage: npm run seed -- --confirm
 */
import mongoose from "mongoose";
import { env } from "../config/env";
import { OrganizationModel } from "../models/organization.model";
import { UserModel } from "../models/user.model";
import { EndpointModel } from "../models/endpoint.model";
import { DetectionModel, severityFromRiskScore } from "../models/detection.model";
import { CTIReportModel } from "../models/ctiReport.model";
import { AuditLogModel } from "../models/auditLog.model";
import { SessionModel } from "../models/session.model";
import { hashPassword } from "../utils/password";
import { hashActivationToken } from "../utils/activationToken";

const CONFIRM_FLAG = "--confirm";

async function wipeAllCollections() {
  await Promise.all([
    OrganizationModel.deleteMany({}),
    UserModel.deleteMany({}),
    EndpointModel.deleteMany({}),
    DetectionModel.deleteMany({}),
    CTIReportModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    SessionModel.deleteMany({}),
  ]);
  console.log("[seed] All collections wiped");
}

async function seedOrganization(name: string, adminName: string, adminEmail: string) {
  const organization = await OrganizationModel.create({ name });

  const passwordHash = await hashPassword("DemoPass123!");
  const admin = await UserModel.create({
    organizationId: organization._id,
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: "ORG_ADMIN",
  });

  const analyst = await UserModel.create({
    organizationId: organization._id,
    name: `${adminName.split(" ")[0]}'s Analyst`,
    email: adminEmail.replace("@", ".analyst@"),
    passwordHash,
    role: "SECURITY_ANALYST",
  });

  return { organization, admin, analyst };
}

async function seedEndpoints(organizationId: mongoose.Types.ObjectId, names: string[]) {
  const endpoints = [];
  for (const name of names) {
    const endpoint = await EndpointModel.create({
      organizationId,
      name,
      status: "ONLINE",
      osVersion: "Windows 11 Pro",
      agentVersion: "1.0.0",
      activationTokenHash: hashActivationToken("seed-placeholder-token"),
      activatedAt: new Date(),
      lastCheckInAt: new Date(),
      cpuUsagePercent: Math.floor(10 + Math.random() * 40),
      ramUsagePercent: Math.floor(20 + Math.random() * 50),
      diskUsagePercent: Math.floor(30 + Math.random() * 40),
    });
    endpoints.push(endpoint);
  }
  return endpoints;
}

interface DetectionSeed {
  endpoint: any;
  riskScore: number;
  status: "NEW" | "INVESTIGATING" | "RESOLVED" | "FALSE_POSITIVE";
  indicatorType: string;
  indicatorDescription: string;
  daysAgo: number;
}

async function seedDetection(organizationId: mongoose.Types.ObjectId, spec: DetectionSeed) {
  const detectedAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000);

  const detection = await DetectionModel.create({
    organizationId,
    endpointId: spec.endpoint._id,
    endpointName: spec.endpoint.name,
    riskScore: spec.riskScore,
    severity: severityFromRiskScore(spec.riskScore),
    status: spec.status,
    indicators: [
      {
        type: spec.indicatorType,
        description: spec.indicatorDescription,
        observedAt: detectedAt,
      },
    ],
    modelVersion: "xgboost-v1.0.0",
    detectedAt,
    resolvedAt: spec.status === "RESOLVED" || spec.status === "FALSE_POSITIVE" ? new Date() : undefined,
  });

  if (spec.status === "NEW" || spec.status === "INVESTIGATING") {
    await EndpointModel.findByIdAndUpdate(spec.endpoint._id, { status: "AT_RISK" });
  }

  return detection;
}

async function seedCTIReport(
  organizationId: mongoose.Types.ObjectId,
  detectionId: mongoose.Types.ObjectId,
  createdByUserId: mongoose.Types.ObjectId,
  published: boolean
) {
  const report = await CTIReportModel.create({
    organizationId,
    detectionId,
    attackSummary:
      "Ransomware-pattern behaviour detected: rapid file renaming with high-entropy filenames, consistent with encryption-based ransomware.",
    indicatorsOfCompromise: [
      "MASS_FILE_RENAME: Bulk file rename with .locked extension",
      "SUSPICIOUS_PROCESS: Unknown process spawned from document editor",
    ],
    recommendedActions: [
      "Disconnect affected endpoint's shared drives to prevent lateral encryption.",
      "Isolate the affected endpoint from the network immediately.",
      "Rotate credentials for any accounts active on the affected machine.",
      "Review backup integrity before restoring any files.",
    ],
    analystNotes: published ? "Confirmed with IT team; phishing email was the entry vector." : undefined,
    status: published ? "PUBLISHED" : "DRAFT",
    createdByUserId,
    transactionHash: published
      ? "0x" + require("crypto").createHash("sha256").update(detectionId.toString()).digest("hex")
      : undefined,
    blockNumber: published ? Math.floor(40000000 + Math.random() * 3000000) : undefined,
    verificationStatus: published ? "VERIFIED" : undefined,
    publishedAt: published ? new Date() : undefined,
  });

  return report;
}

async function main() {
  if (!process.argv.includes(CONFIRM_FLAG)) {
    console.error(`[seed] Refusing to run without ${CONFIRM_FLAG} flag - this wipes all data.`);
    console.error(`[seed] Run again as: npm run seed -- --confirm`);
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);
  console.log("[seed] Connected to MongoDB");

  await wipeAllCollections();

  // ===== Organization A: BrightPath Logistics =====
  const orgA = await seedOrganization("BrightPath Logistics", "Sarah Connor", "sarah@brightpath.com");
  const endpointsA = await seedEndpoints(orgA.organization._id, [
    "Finance-PC-01",
    "Sales-PC-01",
    "HR-Laptop-03",
    "Warehouse-Scanner-12",
  ]);

  const detectionA1 = await seedDetection(orgA.organization._id, {
    endpoint: endpointsA[0],
    riskScore: 96,
    status: "NEW",
    indicatorType: "MASS_FILE_RENAME",
    indicatorDescription: "142 files renamed with .locked extension in 8 seconds",
    daysAgo: 0,
  });
  await seedCTIReport(orgA.organization._id, detectionA1._id, orgA.admin._id, false);

  const detectionA2 = await seedDetection(orgA.organization._id, {
    endpoint: endpointsA[1],
    riskScore: 88,
    status: "RESOLVED",
    indicatorType: "SUSPICIOUS_PROCESS",
    indicatorDescription: "Unknown process spawned from winword.exe",
    daysAgo: 3,
  });
  await seedCTIReport(orgA.organization._id, detectionA2._id, orgA.admin._id, true);

  await seedDetection(orgA.organization._id, {
    endpoint: endpointsA[2],
    riskScore: 45,
    status: "FALSE_POSITIVE",
    indicatorType: "SUSPICIOUS_PATH",
    indicatorDescription: "File created in temp directory during software update",
    daysAgo: 5,
  });

  // ===== Organization B: Northwind Security =====
  const orgB = await seedOrganization("Northwind Security", "Jordan Lee", "jordan@northwind.com");
  const endpointsB = await seedEndpoints(orgB.organization._id, ["Reception-PC-01", "Manager-Laptop-01"]);

  const detectionB1 = await seedDetection(orgB.organization._id, {
    endpoint: endpointsB[0],
    riskScore: 91,
    status: "INVESTIGATING",
    indicatorType: "MASS_FILE_RENAME",
    indicatorDescription: "Bulk encryption pattern detected across shared drive",
    daysAgo: 1,
  });
  await seedCTIReport(orgB.organization._id, detectionB1._id, orgB.admin._id, true);

  console.log("[seed] Demo data seeded successfully:");
  console.log(`  Org A: BrightPath Logistics (sarah@brightpath.com / DemoPass123!)`);
  console.log(`  Org B: Northwind Security (jordan@northwind.com / DemoPass123!)`);
  console.log(`  All demo passwords: DemoPass123!`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("[seed] Failed:", error);
  process.exit(1);
});