import { Schema, model, Document, Types } from "mongoose";

export type TimelineEventType =
  | "DETECTION_CREATED"
  | "DETECTION_UPDATED"
  | "DETECTION_RESOLVED"
  | "DETECTION_FALSE_POSITIVE"
  | "ISOLATION_REQUESTED"
  | "ISOLATION_SENT"
  | "ISOLATION_ACKNOWLEDGED"
  | "ISOLATION_COMPLETED"
  | "ISOLATION_FAILED"
  | "UNISOLATION_REQUESTED"
  | "UNISOLATION_SENT"
  | "UNISOLATION_ACKNOWLEDGED"
  | "UNISOLATION_COMPLETED"
  | "UNISOLATION_FAILED"
  | "ENDPOINT_STATUS_CHANGED"
  | "POLICY_TRIGGERED"
  | "CTI_MATCHED"
  | "CASCADE_DETECTED"
  | "HEARTBEAT_STATUS_CHANGED";

export type TimelineActorType =
  | "USER"
  | "SECURITY_ANALYST"
  | "ORG_ADMIN"
  | "AGENT"
  | "SYSTEM"
  | "AUTOMATED_POLICY";

export interface TimelineEventDocument extends Document {
  organizationId: Types.ObjectId;
  endpointId: Types.ObjectId;
  endpointName: string;
  detectionId?: Types.ObjectId;
  actionId?: Types.ObjectId;
  eventType: TimelineEventType;
  actorType: TimelineActorType;
  actorId?: Types.ObjectId;
  actorName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const timelineEventSchema = new Schema<TimelineEventDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    endpointId: {
      type: Schema.Types.ObjectId,
      ref: "Endpoint",
      required: true,
      index: true,
    },
    endpointName: {
      type: String,
      required: true,
    },
    detectionId: {
      type: Schema.Types.ObjectId,
      ref: "Detection",
      index: true,
    },
    actionId: {
      type: Schema.Types.ObjectId,
      ref: "EndpointAction",
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "DETECTION_CREATED",
        "DETECTION_UPDATED",
        "DETECTION_RESOLVED",
        "DETECTION_FALSE_POSITIVE",
        "ISOLATION_REQUESTED",
        "ISOLATION_SENT",
        "ISOLATION_ACKNOWLEDGED",
        "ISOLATION_COMPLETED",
        "ISOLATION_FAILED",
        "UNISOLATION_REQUESTED",
        "UNISOLATION_SENT",
        "UNISOLATION_ACKNOWLEDGED",
        "UNISOLATION_COMPLETED",
        "UNISOLATION_FAILED",
        "ENDPOINT_STATUS_CHANGED",
        "POLICY_TRIGGERED",
        "CTI_MATCHED",
        "CASCADE_DETECTED",
        "HEARTBEAT_STATUS_CHANGED",
      ],
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: [
        "USER",
        "SECURITY_ANALYST",
        "ORG_ADMIN",
        "AGENT",
        "SYSTEM",
        "AUTOMATED_POLICY",
      ],
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    actorName: {
      type: String,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for fast scoped chronological queries
timelineEventSchema.index({ organizationId: 1, endpointId: 1, timestamp: -1 });
timelineEventSchema.index({ organizationId: 1, detectionId: 1, timestamp: -1 });
timelineEventSchema.index({ organizationId: 1, timestamp: -1 });

export const TimelineEventModel = model<TimelineEventDocument>(
  "TimelineEvent",
  timelineEventSchema
);
