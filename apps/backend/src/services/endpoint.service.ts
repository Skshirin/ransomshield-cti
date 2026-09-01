import { Types } from "mongoose";
import { EndpointModel } from "../models/endpoint.model";
import {
  generateActivationToken,
  hashActivationToken,
  activationTokenExpiry,
} from "../utils/activationToken";
import { AppError } from "../middleware/error.middleware";
import { emitToOrganization } from "../websocket/socket";

interface CreateEndpointInput {
  organizationId: string;
  name: string;
}

export async function createEndpoint(input: CreateEndpointInput) {
  const existing = await EndpointModel.findOne({
    organizationId: input.organizationId,
    name: input.name.trim(),
    isDeleted: false,
  });
  if (existing) {
    throw new AppError("An endpoint with this name already exists", 409);
  }

  const rawToken = generateActivationToken();

  const endpoint = await EndpointModel.create({
    organizationId: input.organizationId,
    name: input.name.trim(),
    status: "PENDING",
    activationTokenHash: hashActivationToken(rawToken),
    activationTokenExpiresAt: activationTokenExpiry(),
  });

  emitToOrganization(input.organizationId, "endpoint:new", endpoint);

  // Raw token is only ever available here, at creation time — the caller
  // (controller) must return it to the client immediately, since it cannot
  // be retrieved again afterward.
  return { endpoint, activationToken: rawToken };
}

interface ListEndpointsInput {
  organizationId: string;
  status?: string;
  search?: string;
}

export async function listEndpoints(input: ListEndpointsInput) {
  // Check for stale online endpoints (no heartbeat in > 60s) and transition to OFFLINE
  const staleThreshold = new Date(Date.now() - 60 * 1000);
  await EndpointModel.updateMany(
    {
      organizationId: input.organizationId,
      status: "ONLINE",
      isDeleted: false,
      lastCheckInAt: { $lt: staleThreshold },
    },
    { status: "OFFLINE" }
  );

  const query: Record<string, any> = {
    organizationId: input.organizationId,
    isDeleted: false,
  };

  if (input.status) {
    query.status = input.status;
  }
  if (input.search) {
    query.name = { $regex: input.search, $options: "i" };
  }

  return EndpointModel.find(query).sort({ createdAt: -1 });
}

export async function getEndpointById(organizationId: string, endpointId: string) {
  if (!Types.ObjectId.isValid(endpointId)) {
    throw new AppError("Invalid endpoint ID", 400);
  }

  const endpoint = await EndpointModel.findOne({
    _id: endpointId,
    organizationId,
    isDeleted: false,
  });

  if (!endpoint) {
    throw new AppError("Endpoint not found", 404);
  }

  return endpoint;
}

export async function removeEndpoint(organizationId: string, endpointId: string) {
  const endpoint = await getEndpointById(organizationId, endpointId);

  // Soft delete — keeps history for audit logs and detection records that
  // reference this endpoint, rather than destroying the row outright.
  endpoint.isDeleted = true;
  await endpoint.save();

  emitToOrganization(organizationId, "endpoint:removed", { endpointId: (endpoint._id as any).toString() });

  return endpoint;
}

export async function activateEndpoint(rawToken: string) {
  const tokenHash = hashActivationToken(rawToken);

  const endpoint = await EndpointModel.findOne({
    activationTokenHash: tokenHash,
    isDeleted: false,
  }).select("+activationTokenHash");

  if (!endpoint) {
    throw new AppError("Invalid activation token", 401);
  }

  if (endpoint.activationTokenExpiresAt && endpoint.activationTokenExpiresAt < new Date()) {
    throw new AppError("Activation token has expired", 401);
  }

  endpoint.status = "ONLINE";
  endpoint.activatedAt = new Date();
  endpoint.lastCheckInAt = new Date();
  await endpoint.save();

  emitToOrganization(endpoint.organizationId.toString(), "endpoint:updated", endpoint);

  return {
    organizationId: endpoint.organizationId.toString(),
    endpointId: (endpoint._id as any).toString(),
  };
}

export async function heartbeatEndpoint(
  endpointId: string,
  stats: { cpuUsagePercent?: number; ramUsagePercent?: number; diskUsagePercent?: number }
) {
  if (!Types.ObjectId.isValid(endpointId)) {
    throw new AppError("Invalid endpoint ID", 400);
  }

  const endpoint = await EndpointModel.findOne({
    _id: endpointId,
    isDeleted: false,
  });

  if (!endpoint) {
    throw new AppError("Endpoint not found", 404);
  }

  endpoint.lastCheckInAt = new Date();

  if (endpoint.status === "PENDING" || endpoint.status === "OFFLINE") {
    endpoint.status = "ONLINE";
  }

  if (stats.cpuUsagePercent !== undefined) {
    endpoint.cpuUsagePercent = stats.cpuUsagePercent;
  }
  if (stats.ramUsagePercent !== undefined) {
    endpoint.ramUsagePercent = stats.ramUsagePercent;
  }
  if (stats.diskUsagePercent !== undefined) {
    endpoint.diskUsagePercent = stats.diskUsagePercent;
  }

  await endpoint.save();

  emitToOrganization(endpoint.organizationId.toString(), "endpoint:heartbeat", endpoint);

  return endpoint;
}