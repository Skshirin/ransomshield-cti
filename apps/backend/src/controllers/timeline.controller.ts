import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  getEndpointTimeline,
  getDetectionTimeline,
} from "../services/timeline.service";

export async function getEndpointTimelineHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  const organizationId = req.user!.organizationId;
  const endpointId = req.params.id;
  const { limit, before, detectionId, actionId, eventType, sort } = req.query;

  const events = await getEndpointTimeline(organizationId, endpointId, {
    limit: limit ? Number(limit) : undefined,
    before: typeof before === "string" ? before : undefined,
    detectionId: typeof detectionId === "string" ? detectionId : undefined,
    actionId: typeof actionId === "string" ? actionId : undefined,
    eventType: typeof eventType === "string" ? eventType : undefined,
    sort: sort === "desc" ? "desc" : "asc",
  });

  res.status(200).json({ events });
}

export async function getDetectionTimelineHandler(
  req: AuthenticatedRequest,
  res: Response
) {
  const organizationId = req.user!.organizationId;
  const detectionId = req.params.id;
  const { limit, before, sort } = req.query;

  const events = await getDetectionTimeline(organizationId, detectionId, {
    limit: limit ? Number(limit) : undefined,
    before: typeof before === "string" ? before : undefined,
    sort: sort === "desc" ? "desc" : "asc",
  });

  res.status(200).json({ events });
}
