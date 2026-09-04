import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import * as threatIntelController from "../controllers/threatIntel.controller";

const router = Router();

// All threat intel routes require authentication
router.use(requireAuth);

router.get("/iocs", threatIntelController.listIOCs);
router.post("/lookup", threatIntelController.lookupIOC);
router.get("/stats", threatIntelController.getStats);

export default router;
