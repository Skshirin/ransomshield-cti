import { Request, Response } from "express";
import { threatIntelService } from "../services/cti/threatIntel.service";
import { AppError } from "../middleware/error.middleware";

export async function listIOCs(req: Request, res: Response) {
  const iocs = await threatIntelService.getAllIOCs();
  return res.status(200).json({ iocs, provider: threatIntelService.getProviderName() });
}

export async function lookupIOC(req: Request, res: Response) {
  const { indicator, type } = req.body;
  if (!indicator) {
    throw new AppError("Indicator is required for lookup", 400);
  }

  const result = await threatIntelService.lookupIndicator(indicator, type);
  return res.status(200).json({ result, provider: threatIntelService.getProviderName() });
}

export async function getStats(req: Request, res: Response) {
  const iocs = await threatIntelService.getAllIOCs();
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const ioc of iocs) {
    byType[ioc.type] = (byType[ioc.type] || 0) + 1;
    bySeverity[ioc.severity] = (bySeverity[ioc.severity] || 0) + 1;
  }

  return res.status(200).json({
    totalIOCs: iocs.length,
    byType,
    bySeverity,
    provider: threatIntelService.getProviderName(),
  });
}
