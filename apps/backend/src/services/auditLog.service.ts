import { AuditLogModel } from "../models/auditLog.model";

interface RecordAuditLogInput {
  organizationId?: string;
  userId?: string;
  userEmail?: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  success: boolean;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog(input: RecordAuditLogInput) {
  try {
    await AuditLogModel.create(input);
  } catch (error) {
    // Audit logging must never crash the actual request — log the failure
    // to console and move on rather than throwing.
    console.error("[audit-log] Failed to record entry:", error);
  }
}

interface ListAuditLogsInput {
  organizationId: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export async function listAuditLogs(input: ListAuditLogsInput) {
  const query: Record<string, any> = { organizationId: input.organizationId };

  if (input.action) query.action = input.action;
  if (input.userId) query.userId = input.userId;
  if (input.from || input.to) {
    query.createdAt = {};
    if (input.from) query.createdAt.$gte = new Date(input.from);
    if (input.to) query.createdAt.$lte = new Date(input.to);
  }

  return AuditLogModel.find(query).sort({ createdAt: -1 }).limit(500);
}