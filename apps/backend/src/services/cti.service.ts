import { Types } from "mongoose";
import { CTIReportModel } from "../models/ctiReport.model";
import { DetectionModel } from "../models/detection.model";
import { AppError } from "../middleware/error.middleware";
import {
  publishHashToBlockchain,
  computeReportContentHash,
} from "./blockchain.service";
import { emitToOrganization } from "../websocket/socket";

function buildIndicatorsOfCompromise(indicators: { type: string; description: string }[]): string[] {
  return indicators.map((i) => `${i.type}: ${i.description}`);
}

function buildRecommendedActions(severity: string): string[] {
  const base = [
    "Isolate the affected endpoint from the network immediately.",
    "Rotate credentials for any accounts active on the affected machine.",
    "Review backup integrity before restoring any files.",
  ];
  if (severity === "CRITICAL" || severity === "HIGH") {
    base.unshift("Disconnect affected endpoint's shared drives to prevent lateral encryption.");
  }
  return base;
}

export async function generateCTIDraft(
  organizationId: string,
  detectionId: string,
  userId: string
) {
  const detection = await DetectionModel.findOne({ _id: detectionId, organizationId });
  if (!detection) {
    throw new AppError("Detection not found", 404);
  }

  const existingDraft = await CTIReportModel.findOne({
    detectionId,
    status: "DRAFT",
  });
  if (existingDraft) {
    return existingDraft;
  }

  const attackSummary =
    `Ransomware-pattern behaviour detected on endpoint "${detection.endpointName}" ` +
    `with a risk score of ${detection.riskScore}/100 (severity: ${detection.severity}). ` +
    `${detection.indicators.length} behavioural indicator(s) were observed.`;

  const report = await CTIReportModel.create({
    organizationId,
    detectionId,
    attackSummary,
    indicatorsOfCompromise: buildIndicatorsOfCompromise(detection.indicators),
    recommendedActions: buildRecommendedActions(detection.severity),
    status: "DRAFT",
    createdByUserId: userId,
  });

  return report;
}

export async function updateCTIDraft(
  organizationId: string,
  reportId: string,
  updates: { analystNotes?: string; attackSummary?: string }
) {
  const report = await CTIReportModel.findOne({ _id: reportId, organizationId });
  if (!report) {
    throw new AppError("CTI report not found", 404);
  }
  if (report.status !== "DRAFT") {
    throw new AppError("Only draft reports can be edited", 400);
  }

  if (updates.analystNotes !== undefined) report.analystNotes = updates.analystNotes;
  if (updates.attackSummary !== undefined) report.attackSummary = updates.attackSummary;

  await report.save();
  return report;
}

export async function publishCTIReport(organizationId: string, reportId: string) {
  const report = await CTIReportModel.findOne({ _id: reportId, organizationId });
  if (!report) {
    throw new AppError("CTI report not found", 404);
  }
  if (report.status === "PUBLISHED") {
    throw new AppError("This report has already been published", 400);
  }

  const contentHash = computeReportContentHash(report);
  const result = await publishHashToBlockchain(
    (report._id as any).toString(),
    contentHash,
    "RANSOMWARE"
  );

  if (!result.success) {
    report.status = "FAILED";
    await report.save();
    throw new AppError(result.error || "Blockchain transaction failed. Please try again.", 502);
  }

  report.status = "PUBLISHED";
  report.transactionHash = result.transactionHash;
  report.blockNumber = result.blockNumber;
  report.verificationStatus = "VERIFIED";
  report.publishedAt = new Date();
  await report.save();

  emitToOrganization(organizationId, "cti:published", report);

  return report;
}

export async function discardCTIDraft(organizationId: string, reportId: string) {
  const report = await CTIReportModel.findOne({ _id: reportId, organizationId });
  if (!report) {
    throw new AppError("CTI report not found", 404);
  }
  if (report.status !== "DRAFT") {
    throw new AppError("Only draft reports can be discarded", 400);
  }
  await report.deleteOne();
}

export async function listCTIReports(organizationId: string) {
  return CTIReportModel.find({ organizationId }).sort({ createdAt: -1 });
}

export async function getCTIReportById(organizationId: string, reportId: string) {
  if (!Types.ObjectId.isValid(reportId)) {
    throw new AppError("Invalid report ID", 400);
  }
  const report = await CTIReportModel.findOne({ _id: reportId, organizationId });
  if (!report) {
    throw new AppError("CTI report not found", 404);
  }
  return report;
}

export async function listPublicCTIFeed() {
  const reports = await CTIReportModel.find({ status: "PUBLISHED" })
    .sort({ publishedAt: -1 })
    .limit(100)
    .select("-organizationId -createdByUserId");
  return reports;
}