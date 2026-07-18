import { DetectionStatus, DetectionSeverity } from "./enums";

export interface BehaviourIndicator {
  type: string;
  description: string;
  observedAt: string;
}

export interface Detection {
  _id: string;
  organizationId: string;
  endpointId: string;
  endpointName: string;
  riskScore: number;
  severity: DetectionSeverity;
  status: DetectionStatus;
  indicators: BehaviourIndicator[];
  detectedAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}