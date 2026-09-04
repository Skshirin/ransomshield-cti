import { Types } from "mongoose";
import { DetectionModel, severityFromRiskScore, BehaviourIndicator } from "../models/detection.model";
import { EndpointModel } from "../models/endpoint.model";
import { UserModel } from "../models/user.model";
import { AppError } from "../middleware/error.middleware";
import { emitToOrganization } from "../websocket/socket";
import { recordTimelineEvent } from "./timeline.service";
import { TimelineActorType } from "../models/timelineEvent.model";

interface CreateDetectionInput {
  organizationId: string;
  endpointId: string;
  riskScore: number;
  indicators: (BehaviourIndicator | string)[];
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

  // Normalize indicators whether they are strings or structured objects
  const formattedIndicators = (input.indicators || []).map((ind: any) => {
    if (typeof ind === "string") {
      return {
        type: "BEHAVIOUR_PATTERN",
        description: ind,
        observedAt: new Date(),
      };
    }
    return {
      type: ind.type || "BEHAVIOUR_PATTERN",
      description: ind.description || String(ind),
      observedAt: ind.observedAt ? new Date(ind.observedAt) : new Date(),
    };
  });

  const detection = await DetectionModel.create({
    organizationId: input.organizationId,
    endpointId: endpoint._id,
    endpointName: endpoint.name,
    riskScore: input.riskScore,
    severity: severityFromRiskScore(input.riskScore),
    indicators: formattedIndicators,
    modelVersion: input.modelVersion,
    detectedAt: input.detectedAt ?? new Date(),
  });

  const prevStatus = endpoint.status;

  // Endpoint moves to AT_RISK the moment a new detection lands on it —
  // matches the Dashboard's donut chart and Endpoint Management status column.
  endpoint.status = "AT_RISK";
  await endpoint.save();

  emitToOrganization(input.organizationId, "endpoint:updated", endpoint);
  emitToOrganization(input.organizationId, "detection:new", detection);

  // Automatically record forensic timeline events
  await recordTimelineEvent({
    organizationId: input.organizationId,
    endpointId: endpoint._id,
    endpointName: endpoint.name,
    detectionId: detection._id,
    eventType: "DETECTION_CREATED",
    actorType: "AGENT",
    actorName: endpoint.name,
    message: `Threat detection recorded on ${endpoint.name} — Risk score: ${input.riskScore}/100 (${detection.severity})`,
    metadata: {
      riskScore: input.riskScore,
      severity: detection.severity,
      indicators: formattedIndicators,
      modelVersion: input.modelVersion,
    },
    timestamp: detection.detectedAt,
  });

  if (prevStatus !== "AT_RISK") {
    await recordTimelineEvent({
      organizationId: input.organizationId,
      endpointId: endpoint._id,
      endpointName: endpoint.name,
      detectionId: detection._id,
      eventType: "ENDPOINT_STATUS_CHANGED",
      actorType: "SYSTEM",
      message: `Endpoint status changed: ${prevStatus} → AT_RISK`,
      metadata: {
        from: prevStatus,
        to: "AT_RISK",
        reason: "Active ransomware threat detected",
      },
      timestamp: detection.detectedAt,
    });
  }

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
  outcome: "RESOLVED" | "FALSE_POSITIVE" = "RESOLVED"
) {
  const detection = await getDetectionById(organizationId, detectionId);

  detection.status = outcome;
  detection.resolvedAt = new Date();
  detection.resolvedByUserId = new Types.ObjectId(userId);
  await detection.save();

  // Determine user identity and role for timeline actor attribution
  let actorName = "Security Analyst";
  let actorType: TimelineActorType = "SECURITY_ANALYST";
  if (userId && Types.ObjectId.isValid(userId)) {
    const user = await UserModel.findById(userId).select("name email role");
    if (user) {
      actorName = user.name || user.email;
      actorType = user.role === "ORG_ADMIN" ? "ORG_ADMIN" : "SECURITY_ANALYST";
    }
  }

  // Record resolution timeline event
  await recordTimelineEvent({
    organizationId,
    endpointId: detection.endpointId,
    endpointName: detection.endpointName,
    detectionId: detection._id,
    eventType: outcome === "FALSE_POSITIVE" ? "DETECTION_FALSE_POSITIVE" : "DETECTION_RESOLVED",
    actorType,
    actorId: userId,
    actorName,
    message: `Detection marked as ${outcome === "RESOLVED" ? "Resolved" : "False Positive"}`,
    metadata: {
      outcome,
      riskScore: detection.riskScore,
      severity: detection.severity,
    },
    timestamp: detection.resolvedAt,
  });

  // If no other active detections remain on this endpoint, bring it back
  // to ONLINE — avoids the endpoint staying "AT_RISK" forever after cleanup.
  const stillAtRisk = await DetectionModel.exists({
    organizationId,
    endpointId: detection.endpointId,
    status: { $in: ["NEW", "INVESTIGATING"] },
  });

  if (!stillAtRisk) {
    const currentEp = await EndpointModel.findById(detection.endpointId);
    if (currentEp && currentEp.status === "AT_RISK") {
      currentEp.status = "ONLINE";
      await currentEp.save();
      emitToOrganization(organizationId, "endpoint:updated", currentEp);

      await recordTimelineEvent({
        organizationId,
        endpointId: currentEp._id,
        endpointName: currentEp.name,
        detectionId: detection._id,
        eventType: "ENDPOINT_STATUS_CHANGED",
        actorType: "SYSTEM",
        message: `Endpoint status changed: AT_RISK → ONLINE (all active threats resolved)`,
        metadata: {
          from: "AT_RISK",
          to: "ONLINE",
          reason: "All active detections resolved",
        },
      });
    }
  }

  emitToOrganization(organizationId, "detection:resolved", detection);

  return detection;
}