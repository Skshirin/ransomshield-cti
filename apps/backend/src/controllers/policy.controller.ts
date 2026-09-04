import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import * as policyService from "../services/policy.service";

export async function listPolicies(req: AuthenticatedRequest, res: Response) {
  const policies = await policyService.listPolicies(req.user!.organizationId);
  return res.status(200).json({ policies });
}

export async function getPolicy(req: AuthenticatedRequest, res: Response) {
  const policy = await policyService.getPolicyById(req.user!.organizationId, req.params.id);
  return res.status(200).json({ policy });
}

export async function createPolicy(req: AuthenticatedRequest, res: Response) {
  const policy = await policyService.createPolicy(
    req.user!.organizationId,
    req.body,
    req.user!.userId
  );
  return res.status(201).json({ policy });
}

export async function updatePolicy(req: AuthenticatedRequest, res: Response) {
  const policy = await policyService.updatePolicy(
    req.user!.organizationId,
    req.params.id,
    req.body,
    req.user!.userId
  );
  return res.status(200).json({ policy });
}

export async function togglePolicy(req: AuthenticatedRequest, res: Response) {
  const policy = await policyService.togglePolicy(
    req.user!.organizationId,
    req.params.id,
    req.body.enabled
  );
  return res.status(200).json({ policy });
}

export async function deletePolicy(req: AuthenticatedRequest, res: Response) {
  const result = await policyService.deletePolicy(req.user!.organizationId, req.params.id);
  return res.status(200).json(result);
}
