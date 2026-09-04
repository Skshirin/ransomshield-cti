import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import * as cascadeService from "../services/cascade.service";

export async function listCascades(req: AuthenticatedRequest, res: Response) {
  const cascades = await cascadeService.listCascades(
    req.user!.organizationId,
    req.query.status as string | undefined
  );
  return res.status(200).json({ cascades });
}

export async function getCascade(req: AuthenticatedRequest, res: Response) {
  const cascade = await cascadeService.getCascadeById(
    req.user!.organizationId,
    req.params.id
  );
  return res.status(200).json({ cascade });
}

export async function containCascade(req: AuthenticatedRequest, res: Response) {
  const result = await cascadeService.containCascade(
    req.user!.organizationId,
    req.params.id,
    req.user!.userId
  );
  return res.status(200).json(result);
}

export async function resolveCascade(req: AuthenticatedRequest, res: Response) {
  const cascade = await cascadeService.resolveCascade(
    req.user!.organizationId,
    req.params.id
  );
  return res.status(200).json({ cascade });
}
