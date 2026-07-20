import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  createEndpoint,
  listEndpoints,
  getEndpointById,
  removeEndpoint,
} from "../services/endpoint.service";
import { AppError } from "../middleware/error.middleware";

export async function addEndpoint(req: AuthenticatedRequest, res: Response) {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new AppError("Endpoint name is required", 400);
  }

  const organizationId = req.user!.organizationId;
  const { endpoint, activationToken } = await createEndpoint({
    organizationId,
    name,
  });

  res.status(201).json({
    message: "Endpoint added. Waiting for agent to connect...",
    endpoint,
    activationToken,
    installInstructions:
      "Run the downloaded installer on the target Windows machine and paste this activation token when prompted. This token expires in 24 hours.",
  });
}

export async function getEndpoints(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  const { status, search } = req.query;

  const endpoints = await listEndpoints({
    organizationId,
    status: typeof status === "string" ? status : undefined,
    search: typeof search === "string" ? search : undefined,
  });

  res.status(200).json({ endpoints });
}

export async function getEndpoint(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  const endpoint = await getEndpointById(organizationId, req.params.id);
  res.status(200).json({ endpoint });
}

export async function deleteEndpoint(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  await removeEndpoint(organizationId, req.params.id);
  res.status(200).json({ message: "Endpoint removed successfully" });
}