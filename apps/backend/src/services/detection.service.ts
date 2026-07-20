import { Types } from "mongoose";
import { DetectionModel, severityFromRiskScore, BehaviourIndicator } from "../models/detection.model";
import { EndpointModel } from "../models/endpoint.model";
import { AppError } from "../middleware/error.middleware";

interface CreateDetectionInput {
  organizationId: string;
  endpointId: string;
  riskScore: number;
  indicators: BehaviourIndicator[];
  modelVersion?: string;
  detectedAt?: Date;
}

export async function createDetection(input: CreateDetectionInput) {
  const endpoint = await EndpointModel.findOne({
    _id: input.endpointId,
    organizationId: input.organizationId,
    isDeleted: false,
  });

  if (!endpoint) {
    throw new AppError("Endpoint not found for this organization", 404);
  }

  const detection = await DetectionModel.create({
    organizationId: input.organizationId,
    endpointId: endpoint._id,
    endpointName: endpoint.name,
    riskScore: input.riskScore,
    severity: severityFromRiskScore(input.riskScore),
    indicators: input.indicators,
    modelVersion: input.modelVersion,
    detectedAt: input.detectedAt ?? new Date(),
  });

  // Endpoint moves to AT_RISK the moment a new detection lands on it —
  // matches the Dashboard's donut chart and Endpoint Management status column.
  endpoint.status = "AT_RISK";
  await endpoint.save();

  return detection;
}

interface ListDetectionsInput {
  organizationId: string;
  status?: string;
  severity?: string;
  endpointId?: string;
  from?: string;
  to?: string;
}

export async function listDetections(input: ListDetectionsInput) {
  const query: Record<string, any> = { organizationId: input.organizationId };

  if (input.status) query.status = input.status;
  if (input.severity) query.severity = input.severity;
  if (input.endpointId) query.endpointId = input.endpointId;
  if (input.from || input.to) {
    query.detectedAt = {};
    if (input.from) query.detectedAt.$gte = new Date(input.from);
    if (input.to) query.detectedAt.$lte = new Date(input.to);
  }

  return DetectionModel.find(query).sort({ detectedAt: -1 }).limit(200);
}

export async function getDetectionById(organizationId: string, detectionId: string) {
  if (!Types.ObjectId.isValid(detectionId)) {
    throw new AppError("Invalid detection ID", 400);
  }

  const detection = await DetectionModel.findOne({
    _id: detectionId,
    organizationId,
  });

  if (!detection) {
    throw new AppError("Detection not found", 404);
  }

  return detection;
}

export async function resolveDetection(
  organizationId: string,
  detectionId: string,
  userId: string,
  outcome: "RESOLVED" | "FALSE_POSITIVE"
) {
  const detection = await getDetectionById(organizationId, detectionId);

  detection.status = outcome;
  detection.resolvedAt = new Date();
  detection.resolvedByUserId = new Types.ObjectId(userId);
  await detection.save();

  // If no other active detections remain on this endpoint, bring it back
  // to ONLINE — avoids the endpoint staying "AT_RISK" forever after cleanup.
  const stillAtRisk = await DetectionModel.exists({
    organizationId,
    endpointId: detection.endpointId,
    status: { $in: ["NEW", "INVESTIGATING"] },
  });

  if (!stillAtRisk) {
    await EndpointModel.findByIdAndUpdate(detection.endpointId, { status: "ONLINE" });
  }

  return detection;
}