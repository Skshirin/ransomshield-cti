import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { listAuditLogs } from "../services/auditLog.service";

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  const { action, userId, from, to } = req.query;

  const logs = await listAuditLogs({
    organizationId,
    action: typeof action === "string" ? action : undefined,
    userId: typeof userId === "string" ? userId : undefined,
    from: typeof from === "string" ? from : undefined,
    to: typeof to === "string" ? to : undefined,
  });

  res.status(200).json({ logs });
}