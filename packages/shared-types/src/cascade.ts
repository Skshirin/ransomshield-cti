export type CascadeAttackType =
  | "RANSOMWARE_PROPAGATION"
  | "COORDINATED_C2_BURST"
  | "LATERAL_MOVEMENT"
  | "MULTI_HOST_ANOMALY";

export type CascadeSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type CascadeStatus = "ACTIVE" | "CONTAINED" | "RESOLVED";

export interface Cascade {
  _id: string;
  organizationId: string;
  cascadeId: string;
  title: string;
  attackType: CascadeAttackType;
  severity: CascadeSeverity;
  confidence: number; // 0 - 100
  status: CascadeStatus;
  affectedEndpointIds: string[];
  affectedEndpointNames: string[];
  relatedDetectionIds: string[];
  matchedIOCs: string[];
  correlationReason: string;
  firstSeen: string;
  lastSeen: string;
  containedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
