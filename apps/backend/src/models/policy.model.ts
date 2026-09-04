import { Schema, model, Document, Types } from "mongoose";
import {
  PolicyConditionField,
  PolicyConditionOperator,
  PolicyActionType,
} from "@ransomware-cti/shared-types";

export interface PolicyConditionDocument {
  field: PolicyConditionField;
  operator: PolicyConditionOperator;
  value: any;
}

export interface PolicyActionDocument {
  type: PolicyActionType;
  params?: Record<string, any>;
}

export interface PolicyDocument extends Document {
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  logicalOperator: "AND" | "OR";
  conditions: PolicyConditionDocument[];
  actions: PolicyActionDocument[];
  cooldownPeriodSeconds: number;
  lastTriggeredAt?: Date;
  triggerCount: number;
  createdByUserId?: Types.ObjectId;
  updatedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conditionSchema = new Schema<PolicyConditionDocument>(
  {
    field: {
      type: String,
      enum: [
        "riskScore",
        "severity",
        "detectionType",
        "consecutiveDetections",
        "ctiMatch",
        "ctiConfidence",
        "maliciousIocMatch",
        "affectedEndpointCount",
        "crossEndpointAttack",
        "endpointStatus",
      ],
      required: true,
    },
    operator: {
      type: String,
      enum: [
        "EQUALS",
        "NOT_EQUALS",
        "GREATER_THAN",
        "GREATER_THAN_OR_EQUAL",
        "LESS_THAN",
        "LESS_THAN_OR_EQUAL",
        "IN",
        "CONTAINS",
      ],
      required: true,
    },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const actionSchema = new Schema<PolicyActionDocument>(
  {
    type: {
      type: String,
      enum: ["ISOLATE_ENDPOINT", "CREATE_ALERT", "MARK_HIGH_RISK"],
      required: true,
    },
    params: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const policySchema = new Schema<PolicyDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    enabled: { type: Boolean, default: true, index: true },
    priority: { type: Number, default: 10, index: true },
    logicalOperator: { type: String, enum: ["AND", "OR"], default: "AND" },
    conditions: { type: [conditionSchema], required: true, default: [] },
    actions: { type: [actionSchema], required: true, default: [] },
    cooldownPeriodSeconds: { type: Number, default: 300, min: 0 },
    lastTriggeredAt: { type: Date },
    triggerCount: { type: Number, default: 0 },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    updatedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

policySchema.index({ organizationId: 1, enabled: 1, priority: -1 });

export const PolicyModel = model<PolicyDocument>("Policy", policySchema);
