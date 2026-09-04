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
  | "HEARTBEAT_STATUS_CHANGED";

export type TimelineActorType =
  | "USER"
  | "SECURITY_ANALYST"
  | "ORG_ADMIN"
  | "AGENT"
  | "SYSTEM"
  | "AUTOMATED_POLICY";

export interface TimelineEvent {
  _id: string;
  organizationId: string;
  endpointId: string;
  endpointName: string;
  detectionId?: string;
  actionId?: string;
  eventType: TimelineEventType;
  actorType: TimelineActorType;
  actorId?: string;
  actorName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}
