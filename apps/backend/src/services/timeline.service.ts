import { Types } from "mongoose";
import {
  TimelineEventModel,
  TimelineEventType,
  TimelineActorType,
  TimelineEventDocument,
} from "../models/timelineEvent.model";
import { EndpointModel } from "../models/endpoint.model";
import { DetectionModel } from "../models/detection.model";
import { AppError } from "../middleware/error.middleware";
import { emitToOrganization } from "../websocket/socket";

export interface CreateTimelineEventInput {
  organizationId: string | Types.ObjectId;
  endpointId: string | Types.ObjectId;
  endpointName?: string;
  detectionId?: string | Types.ObjectId;
  actionId?: string | Types.ObjectId;
  eventType: TimelineEventType;
  actorType: TimelineActorType;
  actorId?: string | Types.ObjectId;
  actorName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export async function recordTimelineEvent(
  input: CreateTimelineEventInput
): Promise<TimelineEventDocument> {
  const orgIdStr = input.organizationId.toString();
  const epIdStr = input.endpointId.toString();

  let epName = input.endpointName;
  if (!epName) {
    const ep = await EndpointModel.findById(input.endpointId).select("name");
    epName = ep?.name || "Unknown Endpoint";
  }

  const event = await TimelineEventModel.create({
    organizationId: new Types.ObjectId(orgIdStr),
    endpointId: new Types.ObjectId(epIdStr),
    endpointName: epName,
    detectionId: input.detectionId ? new Types.ObjectId(input.detectionId.toString()) : undefined,
    actionId: input.actionId ? new Types.ObjectId(input.actionId.toString()) : undefined,
    eventType: input.eventType,
    actorType: input.actorType,
    actorId: input.actorId ? new Types.ObjectId(input.actorId.toString()) : undefined,
    actorName: input.actorName,
    message: input.message,
    metadata: input.metadata,
    timestamp: input.timestamp || new Date(),
  });

  emitToOrganization(orgIdStr, "timeline:event", event);

  return event;
}

export interface ListEndpointTimelineOptions {
  limit?: number;
  before?: string;
  detectionId?: string;
  actionId?: string;
  eventType?: string;
  sort?: "asc" | "desc";
}

export async function getEndpointTimeline(
  organizationId: string,
  endpointId: string,
  options: ListEndpointTimelineOptions = {}
) {
  if (!Types.ObjectId.isValid(endpointId)) {
    throw new AppError("Invalid endpoint ID", 400);
  }

  // Scoped verification: ensure endpoint belongs to this organization
  const endpoint = await EndpointModel.findOne({
    _id: endpointId,
    organizationId,
    isDeleted: false,
  });

  if (!endpoint) {
    throw new AppError("Endpoint not found for this organization", 404);
  }

  const query: Record<string, any> = {
    organizationId,
    endpointId,
  };

  if (options.detectionId) {
    if (Types.ObjectId.isValid(options.detectionId)) {
      query.detectionId = options.detectionId;
    }
  }

  if (options.actionId) {
    if (Types.ObjectId.isValid(options.actionId)) {
      query.actionId = options.actionId;
    }
  }

  if (options.eventType) {
    query.eventType = options.eventType;
  }

  if (options.before) {
    query.timestamp = { $lt: new Date(options.before) };
  }

  const sortOrder = options.sort === "desc" ? -1 : 1;
  const limit = Math.min(Math.max(Number(options.limit) || 100, 1), 500);

  return TimelineEventModel.find(query)
    .sort({ timestamp: sortOrder, _id: sortOrder })
    .limit(limit);
}

export interface ListDetectionTimelineOptions {
  limit?: number;
  before?: string;
  sort?: "asc" | "desc";
}

export async function getDetectionTimeline(
  organizationId: string,
  detectionId: string,
  options: ListDetectionTimelineOptions = {}
) {
  if (!Types.ObjectId.isValid(detectionId)) {
    throw new AppError("Invalid detection ID", 400);
  }

  // Scoped verification: ensure detection belongs to this organization
  const detection = await DetectionModel.findOne({
    _id: detectionId,
    organizationId,
  });

  if (!detection) {
    throw new AppError("Detection not found for this organization", 404);
  }

  const query: Record<string, any> = {
    organizationId,
    $or: [
      { detectionId },
      { endpointId: detection.endpointId },
    ],
  };

  if (options.before) {
    query.timestamp = { $lt: new Date(options.before) };
  }

  const sortOrder = options.sort === "desc" ? -1 : 1;
  const limit = Math.min(Math.max(Number(options.limit) || 100, 1), 500);

  return TimelineEventModel.find(query)
    .sort({ timestamp: sortOrder, _id: sortOrder })
    .limit(limit);
}
