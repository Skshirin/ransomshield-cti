import { Response } from "express";
import { Request } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  createDetection,
  listDetections,
  getDetectionById,
  resolveDetection,
} from "../services/detection.service";
import { AppError } from "../middleware/error.middleware";

// Called by the ML service (service-API-key auth, not a logged-in user).
export async function ingestDetection(req: Request, res: Response) {
  const { organizationId, endpointId, riskScore, indicators, modelVersion, detectedAt } = req.body;

  if (!organizationId || !endpointId || typeof riskScore !== "number") {
    throw new AppError("organizationId, endpointId, and riskScore are required", 400);
  }

  const detection = await createDetection({
    organizationId,
    endpointId,
    riskScore,
    indicators: indicators ?? [],
    modelVersion,
    detectedAt: detectedAt ? new Date(detectedAt) : undefined,
  });

  res.status(201).json({ message: "Detection recorded", detection });
}

export async function getDetections(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  const { status, severity, endpointId, from, to } = req.query;

  const detections = await listDetections({
    organizationId,
    status: typeof status === "string" ? status : undefined,
    severity: typeof severity === "string" ? severity : undefined,
    endpointId: typeof endpointId === "string" ? endpointId : undefined,
    from: typeof from === "string" ? from : undefined,
    to: typeof to === "string" ? to : undefined,
  });

  res.status(200).json({ detections });
}

export async function getDetection(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  const detection = await getDetectionById(organizationId, req.params.id);
  res.status(200).json({ detection });
}

export async function markResolved(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  const userId = req.user!.userId;
  const { outcome } = req.body as { outcome?: "RESOLVED" | "FALSE_POSITIVE" };

  if (outcome !== "RESOLVED" && outcome !== "FALSE_POSITIVE") {
    throw new AppError('outcome must be "RESOLVED" or "FALSE_POSITIVE"', 400);
  }

  const detection = await resolveDetection(organizationId, req.params.id, userId, outcome);
  res.status(200).json({
    message: `Detection marked as ${outcome === "RESOLVED" ? "resolved" : "false positive"}`,
    detection,
  });
}