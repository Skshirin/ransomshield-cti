import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { auditLog } from "../middleware/auditLog.middleware";
import {
  createDraft,
  editDraft,
  publish,
  discard,
  getReports,
  getReport,
  getPublicFeed,
} from "../controllers/cti.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(getReports));
router.get("/feed", asyncHandler(getPublicFeed)); // must come before /:id
router.get("/:id", asyncHandler(getReport));

router.post("/", auditLog("CTI_DRAFT_GENERATED"), asyncHandler(createDraft));
router.patch("/:id", asyncHandler(editDraft));
router.post("/:id/publish", auditLog("CTI_PUBLISHED"), asyncHandler(publish));
router.delete("/:id", asyncHandler(discard));

export default router;