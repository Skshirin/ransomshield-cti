import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import * as cascadeController from "../controllers/cascade.controller";

const router = Router();

// All cascade routes require authentication
router.use(requireAuth);

router.get("/", cascadeController.listCascades);
router.get("/:id", cascadeController.getCascade);

// Containment & Resolution require SECURITY_ANALYST or ORG_ADMIN
router.post("/:id/contain", requireRole("ORG_ADMIN", "SECURITY_ANALYST"), cascadeController.containCascade);
router.post("/:id/resolve", requireRole("ORG_ADMIN", "SECURITY_ANALYST"), cascadeController.resolveCascade);

export default router;
