import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  generateCTIDraft,
  updateCTIDraft,
  publishCTIReport,
  discardCTIDraft,
  listCTIReports,
  getCTIReportById,
  listPublicCTIFeed,
} from "../services/cti.service";
import { AppError } from "../middleware/error.middleware";

export async function createDraft(req: AuthenticatedRequest, res: Response) {
  const { detectionId } = req.body;
  if (!detectionId) {
    throw new AppError("detectionId is required", 400);
  }

  const report = await generateCTIDraft(
    req.user!.organizationId,
    detectionId,
    req.user!.userId
  );

  res.status(201).json({
    message: "CTI report generated. Please review before publishing.",
    report,
  });
}

export async function editDraft(req: AuthenticatedRequest, res: Response) {
  const report = await updateCTIDraft(req.user!.organizationId, req.params.id, {
    analystNotes: req.body.analystNotes,
    attackSummary: req.body.attackSummary,
  });
  res.status(200).json({ message: "Draft updated", report });
}

export async function publish(req: AuthenticatedRequest, res: Response) {
  const report = await publishCTIReport(req.user!.organizationId, req.params.id);
  res.status(200).json({
    message: "CTI published successfully. Transaction confirmed on Polygon.",
    report,
  });
}

export async function discard(req: AuthenticatedRequest, res: Response) {
  await discardCTIDraft(req.user!.organizationId, req.params.id);
  res.status(200).json({ message: "Draft discarded" });
}

export async function getReports(req: AuthenticatedRequest, res: Response) {
  const reports = await listCTIReports(req.user!.organizationId);
  res.status(200).json({ reports });
}

export async function getReport(req: AuthenticatedRequest, res: Response) {
  const report = await getCTIReportById(req.user!.organizationId, req.params.id);
  res.status(200).json({ report });
}

export async function getPublicFeed(_req: AuthenticatedRequest, res: Response) {
  const reports = await listPublicCTIFeed();
  res.status(200).json({ reports });
}