import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  createEndpoint,
  listEndpoints,
  getEndpointById,
  removeEndpoint,
  activateEndpoint,
  heartbeatEndpoint,
  isolateEndpoint,
  unisolateEndpoint,
  getEndpointActions,
  acknowledgeAction,
} from "../services/endpoint.service";
import { AppError } from "../middleware/error.middleware";
import { Request } from "express";

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
      "1. On the target Windows machine, set ACTIVATION_TOKEN=<token> in the agent's .env file. 2. Run the agent as Administrator: python main.py. 3. The endpoint will appear as ONLINE within seconds of activation.",
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

export async function activate(req: Request, res: Response) {
  const { activationToken } = req.body;
  if (!activationToken) {
    throw new AppError("activationToken is required", 400);
  }

  const result = await activateEndpoint(activationToken);

  res.status(200).json({
    message: "Endpoint activated successfully",
    organizationId: result.organizationId,
    endpointId: result.endpointId,
  });
}

export async function isolate(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  const userId = req.user?.userId;
  const { reason } = req.body;

  const result = await isolateEndpoint(organizationId, req.params.id, userId, reason);

  res.status(200).json({
    message: "Endpoint isolated successfully",
    endpoint: result.endpoint,
    action: result.action,
  });
}

export async function unisolate(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  const userId = req.user?.userId;

  const result = await unisolateEndpoint(organizationId, req.params.id, userId);

  res.status(200).json({
    message: "Endpoint isolation released successfully",
    endpoint: result.endpoint,
    action: result.action,
  });
}

export async function listActions(req: AuthenticatedRequest, res: Response) {
  const organizationId = req.user!.organizationId;
  const actions = await getEndpointActions(organizationId, req.params.id);
  res.status(200).json({ actions });
}

export async function ackAction(req: Request, res: Response) {
  const { status, errorMessage } = req.body;
  if (!status || !["ACKNOWLEDGED", "COMPLETED", "FAILED"].includes(status)) {
    throw new AppError("Valid action status is required (ACKNOWLEDGED, COMPLETED, or FAILED)", 400);
  }

  const action = await acknowledgeAction(
    req.params.id,
    req.params.actionId,
    status,
    errorMessage
  );

  res.status(200).json({
    message: "Action acknowledgment recorded",
    action,
  });
}

export async function heartbeat(req: Request, res: Response) {
  const { cpuUsagePercent, ramUsagePercent, diskUsagePercent } = req.body;
  
  const { endpoint, pendingActions } = await heartbeatEndpoint(req.params.id, {
    cpuUsagePercent,
    ramUsagePercent,
    diskUsagePercent,
  });

  res.status(200).json({
    message: "Heartbeat check-in successful",
    status: endpoint.status,
    lastCheckInAt: endpoint.lastCheckInAt,
    pendingActions: (pendingActions || []).map((a) => ({
      actionId: a._id.toString(),
      endpointId: a.endpointId.toString(),
      actionType: a.actionType,
      reason: a.reason,
      status: a.status,
      requestedAt: a.requestedAt,
    })),
  });
}