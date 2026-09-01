import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { requireServiceApiKey } from "../middleware/serviceAuth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { auditLog } from "../middleware/auditLog.middleware";
import {
  addEndpoint,
  getEndpoints,
  getEndpoint,
  deleteEndpoint,
  activate,
  heartbeat,
} from "../controllers/endpoint.controller";

const router = Router();

// Public bootstrap route - the activation token itself IS the credential
// (same pattern as an npm publish token), so no JWT is required here. This
// must be registered before requireAuth below.
router.post("/activate", asyncHandler(activate));

// Heartbeat route for machine-to-machine check-ins from the agent
router.post("/:id/heartbeat", requireServiceApiKey, asyncHandler(heartbeat));

router.use(requireAuth);

router.get("/", asyncHandler(getEndpoints));
router.get("/:id", asyncHandler(getEndpoint));

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