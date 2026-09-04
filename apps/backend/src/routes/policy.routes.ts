import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import * as policyController from "../controllers/policy.controller";

const router = Router();

// All policy routes require authentication
router.use(requireAuth);

// Read policies: accessible to all authenticated organization users
router.get("/", policyController.listPolicies);
router.get("/:id", policyController.getPolicy);

// Mutations: restricted to ORG_ADMIN and SECURITY_ANALYST
router.post("/", requireRole("ORG_ADMIN", "SECURITY_ANALYST"), policyController.createPolicy);
router.patch("/:id", requireRole("ORG_ADMIN", "SECURITY_ANALYST"), policyController.updatePolicy);
router.patch("/:id/toggle", requireRole("ORG_ADMIN", "SECURITY_ANALYST"), policyController.togglePolicy);
router.delete("/:id", requireRole("ORG_ADMIN", "SECURITY_ANALYST"), policyController.deletePolicy);

export default router;
