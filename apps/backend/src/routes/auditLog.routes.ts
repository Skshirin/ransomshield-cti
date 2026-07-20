import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { getAuditLogs } from "../controllers/auditLog.controller";

const router = Router();

router.use(requireAuth);
// Matches UX doc: Audit Logs is Org Admin-only ("Screens They Access" table).
router.get("/", requireRole("ORG_ADMIN"), asyncHandler(getAuditLogs));

export default router;