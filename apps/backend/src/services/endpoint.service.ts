import { Types } from "mongoose";
import { EndpointModel } from "../models/endpoint.model";
import {
  generateActivationToken,
  hashActivationToken,
  activationTokenExpiry,
} from "../utils/activationToken";
import { AppError } from "../middleware/error.middleware";

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

  return endpoint;
}