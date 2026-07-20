import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { auditLog } from "../middleware/auditLog.middleware";
import {
  addEndpoint,
  getEndpoints,
  getEndpoint,
  deleteEndpoint,
} from "../controllers/endpoint.controller";

const router = Router();

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