import { Router } from "express";
import { register, login, refresh, logout } from "../controllers/auth.controller";

function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/refresh-token", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));

export default router;