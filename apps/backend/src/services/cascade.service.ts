import { Types } from "mongoose";
import { CascadeModel, CascadeDocument } from "../models/cascade.model";
import { DetectionModel, DetectionDocument } from "../models/detection.model";
import { EndpointModel } from "../models/endpoint.model";
import { emitToOrganization } from "../websocket/socket";
import { recordTimelineEvent } from "./timeline.service";
import { isolateEndpoint } from "./endpoint.service";
import { AppError } from "../middleware/error.middleware";

const CORRELATION_WINDOW_SECONDS = 120; // 2 minutes sliding correlation window

export async function correlateCascade(detection: DetectionDocument): Promise<CascadeDocument | null> {
  const orgId = detection.organizationId.toString();
  const windowStart = new Date(Date.now() - CORRELATION_WINDOW_SECONDS * 1000);

  // Find recent detections across the organization in the correlation window
  const recentDetections = await DetectionModel.find({
    organizationId: detection.organizationId,
    _id: { $ne: detection._id },
    detectedAt: { $gte: windowStart },
  }).sort({ detectedAt: -1 });

  if (recentDetections.length === 0) {
    return null;
  }

  // Filter for detections on other endpoints
  const currentEndpointIdStr = detection.endpointId.toString();
  const otherEndpointDetections = recentDetections.filter(
    (d) => d.endpointId.toString() !== currentEndpointIdStr
  );

  if (otherEndpointDetections.length === 0) {
    return null;
  }

  // Check correlation factors:
  // 1. Shared IOC match
  const currentIOC = detection.ctiMatch?.matched ? detection.ctiMatch.indicator : null;
  const sharedIOCDetections = otherEndpointDetections.filter(
    (d) => currentIOC && d.ctiMatch?.matched && d.ctiMatch.indicator === currentIOC
  );

  // 2. High severity / high risk score proximity
  const highRiskDetections = otherEndpointDetections.filter(
    (d) => d.riskScore >= 70 || d.severity === "CRITICAL" || d.severity === "HIGH"
  );

  let isCorrelated = false;
  let correlationReason = "";
  let attackType: "RANSOMWARE_PROPAGATION" | "COORDINATED_C2_BURST" | "MULTI_HOST_ANOMALY" = "RANSOMWARE_PROPAGATION";
  let confidence = 85;

  if (sharedIOCDetections.length > 0 && currentIOC) {
    isCorrelated = true;
    attackType = "COORDINATED_C2_BURST";
    confidence = 96;
    correlationReason = `Multiple endpoints (${[
      detection.endpointName,
      ...sharedIOCDetections.map((d) => d.endpointName),
    ].join(", ")}) exhibited malicious behavior matching shared Threat Intel IOC: ${currentIOC}`;
  } else if (detection.riskScore >= 70 && highRiskDetections.length > 0) {
    isCorrelated = true;
    attackType = "RANSOMWARE_PROPAGATION";
    confidence = 90;
    correlationReason = `${
      highRiskDetections.length + 1
    } endpoints generated high-risk ransomware detections within ${CORRELATION_WINDOW_SECONDS}s temporal window.`;
  }

  if (!isCorrelated) {
    return null;
  }

  // Collect all affected endpoint IDs and names
  const affectedEndpointMap = new Map<string, string>();
  affectedEndpointMap.set(currentEndpointIdStr, detection.endpointName);

  const relatedDetectionIds: Types.ObjectId[] = [detection._id as Types.ObjectId];
  const matchedIOCsSet = new Set<string>();
  if (currentIOC) matchedIOCsSet.add(currentIOC);

  const relatedDets = sharedIOCDetections.length > 0 ? sharedIOCDetections : highRiskDetections;
  for (const d of relatedDets) {
    affectedEndpointMap.set(d.endpointId.toString(), d.endpointName);
    relatedDetectionIds.push(d._id as Types.ObjectId);
    if (d.ctiMatch?.matched && d.ctiMatch.indicator) {
      matchedIOCsSet.add(d.ctiMatch.indicator);
    }
  }

  const affectedEndpointIds = Array.from(affectedEndpointMap.keys()).map((id) => new Types.ObjectId(id));
  const affectedEndpointNames = Array.from(affectedEndpointMap.values());
  const matchedIOCs = Array.from(matchedIOCsSet);

  // Check if an existing ACTIVE cascade already exists for this org
  let existingCascade = await CascadeModel.findOne({
    organizationId: detection.organizationId,
    status: "ACTIVE",
    lastSeen: { $gte: new Date(Date.now() - CORRELATION_WINDOW_SECONDS * 2 * 1000) },
  });

  if (existingCascade) {
    // Merge into existing cascade
    for (const epId of affectedEndpointIds) {
      if (!existingCascade.affectedEndpointIds.some((id) => id.toString() === epId.toString())) {
        existingCascade.affectedEndpointIds.push(epId);
      }
    }
    for (const epName of affectedEndpointNames) {
      if (!existingCascade.affectedEndpointNames.includes(epName)) {
        existingCascade.affectedEndpointNames.push(epName);
      }
    }
    for (const detId of relatedDetectionIds) {
      if (!existingCascade.relatedDetectionIds.some((id) => id.toString() === detId.toString())) {
        existingCascade.relatedDetectionIds.push(detId);
      }
    }
    for (const ioc of matchedIOCs) {
      if (!existingCascade.matchedIOCs.includes(ioc)) {
        existingCascade.matchedIOCs.push(ioc);
      }
    }

    existingCascade.lastSeen = new Date();
    existingCascade.confidence = Math.max(existingCascade.confidence, confidence);
    existingCascade.correlationReason = correlationReason;
    await existingCascade.save();

    detection.cascadeId = existingCascade.cascadeId;
    await detection.save();

    emitToOrganization(orgId, "cascade:updated", existingCascade);

    // Record timeline event on current endpoint
    await recordTimelineEvent({
      organizationId: detection.organizationId,
      endpointId: detection.endpointId,
      endpointName: detection.endpointName,
      detectionId: detection._id,
      eventType: "CASCADE_DETECTED",
      actorType: "SYSTEM",
      message: `Endpoint added to cross-endpoint attack cascade ${existingCascade.cascadeId} (${existingCascade.affectedEndpointNames.length} hosts affected)`,
      metadata: {
        cascadeId: existingCascade.cascadeId,
        attackType: existingCascade.attackType,
        affectedEndpoints: existingCascade.affectedEndpointNames,
        confidence: existingCascade.confidence,
      },
    });

    return existingCascade;
  }

  // Create new cascade
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const cascadeId = `CAS-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
  const title = `Coordinated Multi-Host Ransomware Attack (${affectedEndpointNames.length} Endpoints)`;

  const newCascade = await CascadeModel.create({
    organizationId: detection.organizationId,
    cascadeId,
    title,
    attackType,
    severity: "CRITICAL",
    confidence,
    status: "ACTIVE",
    affectedEndpointIds,
    affectedEndpointNames,
    relatedDetectionIds,
    matchedIOCs,
    correlationReason,
    firstSeen: new Date(),
    lastSeen: new Date(),
  });

  detection.cascadeId = cascadeId;
  await detection.save();

  emitToOrganization(orgId, "cascade:created", newCascade);

  // Record timeline event for the newly created cascade
  await recordTimelineEvent({
    organizationId: detection.organizationId,
    endpointId: detection.endpointId,
    endpointName: detection.endpointName,
    detectionId: detection._id,
    eventType: "CASCADE_DETECTED",
    actorType: "SYSTEM",
    message: `Cross-endpoint attack cascade detected: ${cascadeId} — ${correlationReason}`,
    metadata: {
      cascadeId,
      attackType,
      affectedEndpoints: affectedEndpointNames,
      confidence,
      matchedIOCs,
    },
  });

  return newCascade;
}

export async function listCascades(organizationId: string, status?: string) {
  const query: Record<string, any> = { organizationId };
  if (status) {
    query.status = status;
  }
  return CascadeModel.find(query).sort({ lastSeen: -1 });
}

export async function getCascadeById(organizationId: string, cascadeId: string) {
  const cascade = await CascadeModel.findOne({
    organizationId,
    $or: [
      { cascadeId },
      ...(Types.ObjectId.isValid(cascadeId) ? [{ _id: cascadeId }] : []),
    ],
  });

  if (!cascade) {
    throw new AppError("Cascade not found", 404);
  }

  return cascade;
}

export async function containCascade(organizationId: string, cascadeId: string, userId?: string) {
  const cascade = await getCascadeById(organizationId, cascadeId);

  const isolatedEndpoints: string[] = [];

  for (const epId of cascade.affectedEndpointIds) {
    const ep = await EndpointModel.findOne({ _id: epId, organizationId, isDeleted: false });
    if (ep && ep.status !== "ISOLATED") {
      await isolateEndpoint(
        organizationId,
        ep._id.toString(),
        userId,
        `Cascade Containment for ${cascade.cascadeId}: ${cascade.title}`
      );
      isolatedEndpoints.push(ep.name);
    }
  }

  cascade.status = "CONTAINED";
  cascade.containedAt = new Date();
  await cascade.save();

  emitToOrganization(organizationId, "cascade:updated", cascade);

  return { cascade, isolatedEndpoints };
}

export async function resolveCascade(organizationId: string, cascadeId: string) {
  const cascade = await getCascadeById(organizationId, cascadeId);

  cascade.status = "RESOLVED";
  cascade.resolvedAt = new Date();
  await cascade.save();

  emitToOrganization(organizationId, "cascade:updated", cascade);

  return cascade;
}
