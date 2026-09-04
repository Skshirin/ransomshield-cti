import { Schema, model, Document, Types } from "mongoose";
import {
  CascadeAttackType,
  CascadeSeverity,
  CascadeStatus,
} from "@ransomware-cti/shared-types";

export interface CascadeDocument extends Document {
  organizationId: Types.ObjectId;
  cascadeId: string;
  title: string;
  attackType: CascadeAttackType;
  severity: CascadeSeverity;
  confidence: number;
  status: CascadeStatus;
  affectedEndpointIds: Types.ObjectId[];
  affectedEndpointNames: string[];
  relatedDetectionIds: Types.ObjectId[];
  matchedIOCs: string[];
  correlationReason: string;
  firstSeen: Date;
  lastSeen: Date;
  containedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cascadeSchema = new Schema<CascadeDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    cascadeId: {
      type: String,
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    attackType: {
      type: String,
      enum: [
        "RANSOMWARE_PROPAGATION",
        "COORDINATED_C2_BURST",
        "LATERAL_MOVEMENT",
        "MULTI_HOST_ANOMALY",
      ],
      default: "RANSOMWARE_PROPAGATION",
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH",
    },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["ACTIVE", "CONTAINED", "RESOLVED"],
      default: "ACTIVE",
      index: true,
    },
    affectedEndpointIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Endpoint",
        required: true,
      },
    ],
    affectedEndpointNames: [{ type: String, required: true }],
    relatedDetectionIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Detection",
      },
    ],
    matchedIOCs: [{ type: String }],
    correlationReason: { type: String, required: true },
    firstSeen: { type: Date, required: true, default: Date.now },
    lastSeen: { type: Date, required: true, default: Date.now, index: true },
    containedAt: { type: Date },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

cascadeSchema.index({ organizationId: 1, status: 1, lastSeen: -1 });
cascadeSchema.index({ organizationId: 1, cascadeId: 1 }, { unique: true });

export const CascadeModel = model<CascadeDocument>("Cascade", cascadeSchema);
