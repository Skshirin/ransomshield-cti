import { Types } from "mongoose";
import { EndpointModel } from "../models/endpoint.model";
import { EndpointActionModel, ActionType, ActionStatus } from "../models/endpointAction.model";
import { DetectionModel } from "../models/detection.model";
import { UserModel } from "../models/user.model";
import {
  generateActivationToken,
  hashActivationToken,
  activationTokenExpiry,
} from "../utils/activationToken";
import { AppError } from "../middleware/error.middleware";
import { emitToOrganization } from "../websocket/socket";
import { recordTimelineEvent } from "./timeline.service";
import { TimelineActorType } from "../models/timelineEvent.model";

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

export async function isolateEndpoint(
  organizationId: string,
  endpointId: string,
  userId?: string,
  reason?: string
) {
  const endpoint = await getEndpointById(organizationId, endpointId);
  const prevStatus = endpoint.status;

  endpoint.status = "ISOLATED";
  await endpoint.save();

  const action = await EndpointActionModel.create({
    organizationId: endpoint.organizationId,
    endpointId: endpoint._id,
    actionType: "ISOLATE",
    status: "PENDING",
    reason: reason || "Ransomware detection or security mitigation response",
    requestedByUserId: userId ? new Types.ObjectId(userId) : undefined,
    requestedAt: new Date(),
  });

  emitToOrganization(organizationId, "endpoint:updated", endpoint);
  emitToOrganization(organizationId, "endpoint:action", action);

  let actorName = "Security Analyst";
  let actorType: TimelineActorType = "SECURITY_ANALYST";
  if (userId && Types.ObjectId.isValid(userId)) {
    const user = await UserModel.findById(userId).select("name email role");
    if (user) {
      actorName = user.name || user.email;
      actorType = user.role === "ORG_ADMIN" ? "ORG_ADMIN" : "SECURITY_ANALYST";
    }
  }

  // Record ISOLATION_REQUESTED
  await recordTimelineEvent({
    organizationId,
    endpointId: endpoint._id,
    endpointName: endpoint.name,
    actionId: action._id,
    eventType: "ISOLATION_REQUESTED",
    actorType,
    actorId: userId,
    actorName,
    message: `Isolation requested for ${endpoint.name}: ${action.reason}`,
    metadata: {
      reason: action.reason,
      actionType: "ISOLATE",
      actionId: action._id.toString(),
    },
    timestamp: action.requestedAt,
  });

  // Record ENDPOINT_STATUS_CHANGED
  if (prevStatus !== "ISOLATED") {
    await recordTimelineEvent({
      organizationId,
      endpointId: endpoint._id,
      endpointName: endpoint.name,
      actionId: action._id,
      eventType: "ENDPOINT_STATUS_CHANGED",
      actorType,
      actorId: userId,
      actorName,
      message: `Endpoint status changed: ${prevStatus} → ISOLATED`,
      metadata: {
        from: prevStatus,
        to: "ISOLATED",
        reason: action.reason,
      },
      timestamp: action.requestedAt,
    });
  }

  return { endpoint, action };
}

export async function unisolateEndpoint(
  organizationId: string,
  endpointId: string,
  userId?: string
) {
  const endpoint = await getEndpointById(organizationId, endpointId);
  const prevStatus = endpoint.status;

  // Check if there are active detections on this endpoint
  const activeDetections = await DetectionModel.exists({
    organizationId,
    endpointId: endpoint._id,
    status: { $in: ["NEW", "INVESTIGATING"] },
  });

  endpoint.status = activeDetections ? "AT_RISK" : "ONLINE";
  await endpoint.save();

  const action = await EndpointActionModel.create({
    organizationId: endpoint.organizationId,
    endpointId: endpoint._id,
    actionType: "UNISOLATE",
    status: "PENDING",
    reason: "Manual release of endpoint isolation by security analyst",
    requestedByUserId: userId ? new Types.ObjectId(userId) : undefined,
    requestedAt: new Date(),
  });

  emitToOrganization(organizationId, "endpoint:updated", endpoint);
  emitToOrganization(organizationId, "endpoint:action", action);

  let actorName = "Security Analyst";
  let actorType: TimelineActorType = "SECURITY_ANALYST";
  if (userId && Types.ObjectId.isValid(userId)) {
    const user = await UserModel.findById(userId).select("name email role");
    if (user) {
      actorName = user.name || user.email;
      actorType = user.role === "ORG_ADMIN" ? "ORG_ADMIN" : "SECURITY_ANALYST";
    }
  }

  // Record UNISOLATION_REQUESTED
  await recordTimelineEvent({
    organizationId,
    endpointId: endpoint._id,
    endpointName: endpoint.name,
    actionId: action._id,
    eventType: "UNISOLATION_REQUESTED",
    actorType,
    actorId: userId,
    actorName,
    message: `Isolation release requested for ${endpoint.name}`,
    metadata: {
      actionType: "UNISOLATE",
      actionId: action._id.toString(),
    },
    timestamp: action.requestedAt,
  });

  // Record ENDPOINT_STATUS_CHANGED
  if (prevStatus !== endpoint.status) {
    await recordTimelineEvent({
      organizationId,
      endpointId: endpoint._id,
      endpointName: endpoint.name,
      actionId: action._id,
      eventType: "ENDPOINT_STATUS_CHANGED",
      actorType,
      actorId: userId,
      actorName,
      message: `Endpoint status changed: ${prevStatus} → ${endpoint.status}`,
      metadata: {
        from: prevStatus,
        to: endpoint.status,
        reason: "Isolation released by security analyst",
      },
      timestamp: action.requestedAt,
    });
  }

  return { endpoint, action };
}

export async function getEndpointActions(organizationId: string, endpointId: string) {
  if (!Types.ObjectId.isValid(endpointId)) {
    throw new AppError("Invalid endpoint ID", 400);
  }

  return EndpointActionModel.find({
    organizationId,
    endpointId,
  }).sort({ createdAt: -1 });
}

export async function acknowledgeAction(
  endpointId: string,
  actionId: string,
  status: "ACKNOWLEDGED" | "COMPLETED" | "FAILED",
  errorMessage?: string
) {
  if (!Types.ObjectId.isValid(endpointId) || !Types.ObjectId.isValid(actionId)) {
    throw new AppError("Invalid endpoint or action ID", 400);
  }

  const action = await EndpointActionModel.findOne({
    _id: actionId,
    endpointId,
  });

  if (!action) {
    throw new AppError("Action not found for this endpoint", 404);
  }

  action.status = status;
  action.executedAt = new Date();
  if (errorMessage) {
    action.errorMessage = errorMessage;
  }
  await action.save();

  emitToOrganization(action.organizationId.toString(), "endpoint:action", action);

  const endpoint = await EndpointModel.findById(action.endpointId).select("name");
  const epName = endpoint?.name || "Endpoint Agent";

  if (status === "ACKNOWLEDGED") {
    await recordTimelineEvent({
      organizationId: action.organizationId,
      endpointId: action.endpointId,
      endpointName: epName,
      actionId: action._id,
      eventType: action.actionType === "ISOLATE" ? "ISOLATION_ACKNOWLEDGED" : "UNISOLATION_ACKNOWLEDGED",
      actorType: "AGENT",
      actorName: epName,
      message: `Agent acknowledged ${action.actionType === "ISOLATE" ? "isolation" : "un-isolation"} command`,
      metadata: {
        actionType: action.actionType,
        actionId: action._id.toString(),
      },
      timestamp: action.executedAt,
    });
  } else if (status === "COMPLETED") {
    await recordTimelineEvent({
      organizationId: action.organizationId,
      endpointId: action.endpointId,
      endpointName: epName,
      actionId: action._id,
      eventType: action.actionType === "ISOLATE" ? "ISOLATION_COMPLETED" : "UNISOLATION_COMPLETED",
      actorType: "AGENT",
      actorName: epName,
      message: `${action.actionType === "ISOLATE" ? "Isolation" : "Un-isolation"} response completed by agent`,
      metadata: {
        actionType: action.actionType,
        actionId: action._id.toString(),
      },
      timestamp: action.executedAt,
    });
  } else if (status === "FAILED") {
    await recordTimelineEvent({
      organizationId: action.organizationId,
      endpointId: action.endpointId,
      endpointName: epName,
      actionId: action._id,
      eventType: action.actionType === "ISOLATE" ? "ISOLATION_FAILED" : "UNISOLATION_FAILED",
      actorType: "AGENT",
      actorName: epName,
      message: `${action.actionType === "ISOLATE" ? "Isolation" : "Un-isolation"} failed on agent: ${errorMessage || "Unknown error"}`,
      metadata: {
        actionType: action.actionType,
        actionId: action._id.toString(),
        errorMessage,
      },
      timestamp: action.executedAt,
    });
  }

  return action;
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

  // If status is not ISOLATED, evaluate active detections to determine status.
  // If no active detections remain, endpoint recovers to ONLINE.
  // If active detections remain, endpoint stays/becomes AT_RISK.
  // If ISOLATED, heartbeat preserves the ISOLATED state.
  if (endpoint.status !== "ISOLATED") {
    const hasActiveDetections = await DetectionModel.exists({
      organizationId: endpoint.organizationId,
      endpointId: endpoint._id,
      status: { $in: ["NEW", "INVESTIGATING"] },
    });

    endpoint.status = hasActiveDetections ? "AT_RISK" : "ONLINE";
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

  // Retrieve pending actions for this specific endpoint
  const pendingActions = await EndpointActionModel.find({
    endpointId,
    status: { $in: ["PENDING", "SENT"] },
  }).sort({ createdAt: 1 });

  // Mark PENDING actions as SENT once fetched by the agent
  const pendingToSent = pendingActions.filter((a) => a.status === "PENDING");
  if (pendingToSent.length > 0) {
    await EndpointActionModel.updateMany(
      { endpointId, status: "PENDING" },
      { status: "SENT" }
    );

    for (const action of pendingToSent) {
      await recordTimelineEvent({
        organizationId: endpoint.organizationId,
        endpointId: endpoint._id,
        endpointName: endpoint.name,
        actionId: action._id,
        eventType: action.actionType === "ISOLATE" ? "ISOLATION_SENT" : "UNISOLATION_SENT",
        actorType: "SYSTEM",
        message: `${action.actionType === "ISOLATE" ? "Isolation" : "Unisolation"} command dispatched to endpoint agent`,
        metadata: {
          actionType: action.actionType,
          actionId: action._id.toString(),
        },
      });
    }
  }

  emitToOrganization(endpoint.organizationId.toString(), "endpoint:heartbeat", endpoint);

  return { endpoint, pendingActions };
}