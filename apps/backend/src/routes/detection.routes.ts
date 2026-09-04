import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { requireServiceApiKey } from "../middleware/serviceAuth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { auditLog } from "../middleware/auditLog.middleware";
import {
  ingestDetection,
  getDetections,
  getDetection,
  markResolved,
} from "../controllers/detection.controller";
import { getDetectionTimelineHandler } from "../controllers/timeline.controller";

const router = Router();

// Internal route — called by the ML service, not the browser. No user JWT
// exists at that point, so this is deliberately mounted before requireAuth.
router.post("/ingest", requireServiceApiKey, asyncHandler(ingestDetection));

router.use(requireAuth);

router.get("/", asyncHandler(getDetections));
router.get("/:id", asyncHandler(getDetection));
router.get("/:id/timeline", asyncHandler(getDetectionTimelineHandler));
router.patch(
  "/:id/resolve",
  requireRole("ORG_ADMIN", "SECURITY_ANALYST"),
  auditLog("DETECTION_RESOLVED"),
  asyncHandler(markResolved)
);
router.post(
  "/:id/resolve",
  requireRole("ORG_ADMIN", "SECURITY_ANALYST"),
  auditLog("DETECTION_RESOLVED"),
  asyncHandler(markResolved)
);

export default router;