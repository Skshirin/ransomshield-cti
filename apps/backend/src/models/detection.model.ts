import { Schema, model, Document, Types } from "mongoose";

export type DetectionStatus = "NEW" | "INVESTIGATING" | "RESOLVED" | "FALSE_POSITIVE";
export type DetectionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface BehaviourIndicator {
  type: string;
  description: string;
  observedAt: Date;
}

export interface DetectionDocument extends Document {
  organizationId: Types.ObjectId;
  endpointId: Types.ObjectId;
  endpointName: string;
  riskScore: number;
  severity: DetectionSeverity;
  status: DetectionStatus;
  indicators: BehaviourIndicator[];
  modelVersion?: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedByUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const behaviourIndicatorSchema = new Schema<BehaviourIndicator>(
  {
    type: { type: String, required: true },
    description: { type: String, required: true },
    observedAt: { type: Date, required: true },
  },
  { _id: false }
);

function severityFromRiskScore(score: number): DetectionSeverity {
  if (score >= 90) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

const detectionSchema = new Schema<DetectionDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    endpointId: { type: Schema.Types.ObjectId, ref: "Endpoint", required: true, index: true },
    endpointName: { type: String, required: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
    },
    status: {
      type: String,
      enum: ["NEW", "INVESTIGATING", "RESOLVED", "FALSE_POSITIVE"],
      default: "NEW",
    },
    indicators: { type: [behaviourIndicatorSchema], default: [] },
    modelVersion: { type: String },
    detectedAt: { type: Date, required: true, default: Date.now },
    resolvedAt: { type: Date },
    resolvedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Serves Detection History's default view (recent-first per org) and its
// filter-by-severity/status use cases without a full collection scan.
detectionSchema.index({ organizationId: 1, detectedAt: -1 });
detectionSchema.index({ organizationId: 1, severity: 1, detectedAt: -1 });
detectionSchema.index({ organizationId: 1, status: 1, detectedAt: -1 });

detectionSchema.statics.deriveSeverity = severityFromRiskScore;

export const DetectionModel = model<DetectionDocument>("Detection", detectionSchema);
export { severityFromRiskScore };