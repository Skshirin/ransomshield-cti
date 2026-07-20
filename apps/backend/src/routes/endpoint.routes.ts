import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import {
  addEndpoint,
  getEndpoints,
  getEndpoint,
  deleteEndpoint,
} from "../controllers/endpoint.controller";

const router = Router();

// All endpoint routes require a logged-in user.
router.use(requireAuth);

router.get("/", asyncHandler(getEndpoints));
router.get("/:id", asyncHandler(getEndpoint));

// Only Org Admins can add/remove endpoints — matches the UX doc's role table
// (Security Analysts can only *view* Endpoint Management, not modify it).
router.post("/", requireRole("ORG_ADMIN"), asyncHandler(addEndpoint));
router.delete("/:id", requireRole("ORG_ADMIN"), asyncHandler(deleteEndpoint));

export default router;