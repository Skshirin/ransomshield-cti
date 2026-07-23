import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { auditLog } from "../middleware/auditLog.middleware";
import {
  invite,
  getUsers,
  getUser,
  changeRole,
  deactivate,
  reactivate,
} from "../controllers/user.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(getUsers));
router.get("/:id", asyncHandler(getUser));

// Only Org Admins manage team membership.
router.post("/", requireRole("ORG_ADMIN"), auditLog("USER_INVITED"), asyncHandler(invite));
router.patch("/:id/role", requireRole("ORG_ADMIN"), auditLog("USER_ROLE_CHANGED"), asyncHandler(changeRole));
router.patch("/:id/deactivate", requireRole("ORG_ADMIN"), auditLog("USER_DEACTIVATED"), asyncHandler(deactivate));
router.patch("/:id/reactivate", requireRole("ORG_ADMIN"), auditLog("USER_REACTIVATED"), asyncHandler(reactivate));

export default router;