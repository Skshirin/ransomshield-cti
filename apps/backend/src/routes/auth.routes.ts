import { Router } from "express";
import { register, login, refresh, logout } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { auditLog } from "../middleware/auditLog.middleware";

const router = Router();

router.post("/register", auditLog("ORGANIZATION_REGISTERED"), asyncHandler(register));
router.post("/login", auditLog("USER_LOGIN"), asyncHandler(login));
router.post("/refresh-token", asyncHandler(refresh)); // too frequent/low-signal to log
router.post("/logout", auditLog("USER_LOGOUT"), asyncHandler(logout));

export default router;