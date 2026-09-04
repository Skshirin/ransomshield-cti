import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { requireServiceApiKey } from "../middleware/serviceAuth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { auditLog } from "../middleware/auditLog.middleware";
import { heartbeatLimiter } from "../middleware/rateLimiter.middleware";
import {
  addEndpoint,
  getEndpoints,
  getEndpoint,
  deleteEndpoint,
  activate,
  heartbeat,
  isolate,
  unisolate,
  listActions,
  ackAction,
} from "../controllers/endpoint.controller";
import { getEndpointTimelineHandler } from "../controllers/timeline.controller";

const router = Router();

// Public bootstrap route - the activation token itself IS the credential
// (same pattern as an npm publish token), so no JWT is required here. This
// must be registered before requireAuth below.
router.post("/activate", asyncHandler(activate));

// Heartbeat route for machine-to-machine check-ins from the agent
router.post("/:id/heartbeat", requireServiceApiKey, heartbeatLimiter, asyncHandler(heartbeat));

// Action acknowledgment for machine-to-machine response reporting
router.post("/:id/actions/:actionId/ack", requireServiceApiKey, asyncHandler(ackAction));

router.use(requireAuth);

router.get("/", asyncHandler(getEndpoints));
router.get("/:id", asyncHandler(getEndpoint));
router.get("/:id/timeline", asyncHandler(getEndpointTimelineHandler));
router.get("/:id/actions", asyncHandler(listActions));

router.post(
  "/:id/isolate",
  requireRole("ORG_ADMIN", "SECURITY_ANALYST"),
  auditLog("ENDPOINT_ISOLATED"),
  asyncHandler(isolate)
);

router.post(
  "/:id/unisolate",
  requireRole("ORG_ADMIN", "SECURITY_ANALYST"),
  auditLog("ENDPOINT_UNISOLATED"),
  asyncHandler(unisolate)
);

router.post(
  "/",
  requireRole("ORG_ADMIN"),
  auditLog("ENDPOINT_ADDED"),
  asyncHandler(addEndpoint)
);
router.delete(
  "/:id",
  requireRole("ORG_ADMIN"),
  auditLog("ENDPOINT_REMOVED"),
  asyncHandler(deleteEndpoint)
);

export default router;