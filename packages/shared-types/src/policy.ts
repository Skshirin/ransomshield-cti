export type PolicyConditionField =
  | "riskScore"
  | "severity"
  | "detectionType"
  | "consecutiveDetections"
  | "ctiMatch"
  | "ctiConfidence"
  | "maliciousIocMatch"
  | "affectedEndpointCount"
  | "crossEndpointAttack"
  | "endpointStatus";

export type PolicyConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "IN"
  | "CONTAINS";

export interface PolicyCondition {
  field: PolicyConditionField;
  operator: PolicyConditionOperator;
  value: any;
}

export type PolicyActionType =
  | "ISOLATE_ENDPOINT"
  | "CREATE_ALERT"
  | "MARK_HIGH_RISK";

export interface PolicyAction {
  type: PolicyActionType;
  params?: Record<string, any>;
}

export interface Policy {
  _id: string;
  organizationId: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number; // e.g. 1 - 100, evaluated in descending order
  logicalOperator: "AND" | "OR";
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  cooldownPeriodSeconds: number; // e.g. 300
  lastTriggeredAt?: string | null;
  triggerCount: number;
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}
