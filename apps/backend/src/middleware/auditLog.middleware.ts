import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware";
import { recordAuditLog } from "../services/auditLog.service";

/**
 * Wraps a route with automatic audit logging. Attach an `action` label
 * (e.g. "ENDPOINT_ADDED") when registering the route; this middleware
 * patches res.json to capture the final status code and outcome, then
 * fires the audit log write after the response has already been sent
 * to the client (so logging never adds latency to the user's request).
 */
export function auditLog(action: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      const statusCode = res.statusCode;
      const success = statusCode < 400;

      // Fire-and-forget — do not await, do not block the response.
      recordAuditLog({
        organizationId: req.user?.organizationId ?? req.body?.organizationId,
        userId: req.user?.userId,
        userEmail: (req.body?.email as string) || undefined,
        action,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        success,
        ipAddress: req.ip,
        metadata: success ? undefined : { error: (body as any)?.error },
      });

      return originalJson(body);
    };

    next();
  };
}