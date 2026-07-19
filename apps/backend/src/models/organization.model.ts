import { Schema, model, Document } from "mongoose";

export interface OrganizationDocument extends Document {
  name: string;
  ctiSharingMode: "AUTO" | "MANUAL";
  retentionDays: number;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<OrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    ctiSharingMode: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      default: "MANUAL",
    },
    retentionDays: { type: Number, default: 365 },
  },
  { timestamps: true }
);

export const OrganizationModel = model<OrganizationDocument>(
  "Organization",
  organizationSchema
);