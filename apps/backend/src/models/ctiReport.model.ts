import { Schema, model, Document, Types } from "mongoose";

export type CTIStatus = "DRAFT" | "PUBLISHED" | "FAILED";
export type BlockchainVerificationStatus = "VERIFIED" | "PENDING" | "FAILED";

export interface CTIReportDocument extends Document {
  organizationId: Types.ObjectId;
  detectionId: Types.ObjectId;
  attackSummary: string;
  indicatorsOfCompromise: string[];
  recommendedActions: string[];
  analystNotes?: string;
  status: CTIStatus;
  createdByUserId: Types.ObjectId;
  transactionHash?: string;
  blockNumber?: number;
  verificationStatus?: BlockchainVerificationStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ctiReportSchema = new Schema<CTIReportDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    detectionId: { type: Schema.Types.ObjectId, ref: "Detection", required: true, index: true },
    attackSummary: { type: String, required: true },
    indicatorsOfCompromise: { type: [String], default: [] },
    recommendedActions: { type: [String], default: [] },
    analystNotes: { type: String },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "FAILED"],
      default: "DRAFT",
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    transactionHash: { type: String },
    blockNumber: { type: Number },
    verificationStatus: {
      type: String,
      enum: ["VERIFIED", "PENDING", "FAILED"],
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

ctiReportSchema.index({ organizationId: 1, createdAt: -1 });
ctiReportSchema.index({ status: 1, publishedAt: -1 });

export const CTIReportModel = model<CTIReportDocument>("CTIReport", ctiReportSchema);