import { Schema, model, Document, Types } from "mongoose";

export interface AuditLogDocument extends Document {
  organizationId?: Types.ObjectId;
  userId?: Types.ObjectId;
  userEmail?: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  success: boolean;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userEmail: { type: String },
    action: { type: String, required: true, index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    success: { type: Boolean, required: true },
    ipAddress: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Retention: audit logs kept 1 year per FirgoMart precedent, then auto-purged.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });
auditLogSchema.index({ organizationId: 1, createdAt: -1 });

export const AuditLogModel = model<AuditLogDocument>("AuditLog", auditLogSchema);