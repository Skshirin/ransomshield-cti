import { Schema, model, Document, Types } from "mongoose";

export type EndpointStatus = "PENDING" | "ONLINE" | "OFFLINE" | "AT_RISK";

export interface EndpointDocument extends Document {
  organizationId: Types.ObjectId;
  name: string;
  status: EndpointStatus;
  osVersion?: string;
  agentVersion?: string;
  activationTokenHash?: string;
  activationTokenExpiresAt?: Date;
  activatedAt?: Date;
  lastCheckInAt?: Date;
  cpuUsagePercent?: number;
  ramUsagePercent?: number;
  diskUsagePercent?: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const endpointSchema = new Schema<EndpointDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "ONLINE", "OFFLINE", "AT_RISK"],
      default: "PENDING",
    },
    osVersion: { type: String },
    agentVersion: { type: String },
    activationTokenHash: { type: String, select: false },
    activationTokenExpiresAt: { type: Date },
    activatedAt: { type: Date },
    lastCheckInAt: { type: Date },
    cpuUsagePercent: { type: Number, min: 0, max: 100 },
    ramUsagePercent: { type: Number, min: 0, max: 100 },
    diskUsagePercent: { type: Number, min: 0, max: 100 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index: every list query is scoped by org and usually filters/sorts
// by status and recency — this index serves both patterns in one structure.
endpointSchema.index({ organizationId: 1, isDeleted: 1, createdAt: -1 });
// Endpoint names should be unique within an org (not globally) to avoid
// "Finance-PC-01" collisions across different customers.
endpointSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

export const EndpointModel = model<EndpointDocument>("Endpoint", endpointSchema);