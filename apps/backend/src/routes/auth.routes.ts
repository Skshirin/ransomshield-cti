import { Router } from "express";
import { register, login, refresh, logout } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/refresh-token", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));

export default router;