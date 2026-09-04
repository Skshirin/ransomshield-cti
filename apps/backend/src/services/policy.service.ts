import { Types } from "mongoose";
import { PolicyModel, PolicyDocument, PolicyConditionDocument } from "../models/policy.model";
import { AppError } from "../middleware/error.middleware";
import { isolateEndpoint } from "./endpoint.service";
import { recordTimelineEvent } from "./timeline.service";
import { emitToOrganization } from "../websocket/socket";
import { DetectionModel } from "../models/detection.model";

export interface PolicyEvaluationContext {
  organizationId: string;
  endpointId: string;
  endpointName: string;
  endpointStatus: string;
  detectionId?: string;
  riskScore?: number;
  severity?: string;
  detectionType?: string;
  consecutiveDetections?: number;
  ctiMatch?: boolean;
  ctiConfidence?: number;
  maliciousIocMatch?: boolean;
  iocValue?: string;
  iocType?: string;
  affectedEndpointCount?: number;
  crossEndpointAttack?: boolean;
  cascadeId?: string;
  cascadeSeverity?: string;
}

export function evaluateCondition(cond: PolicyConditionDocument, context: PolicyEvaluationContext): boolean {
  let contextValue: any;

  switch (cond.field) {
    case "riskScore":
      contextValue = context.riskScore ?? 0;
      break;
    case "severity":
      contextValue = (context.severity || "").toUpperCase();
      break;
    case "detectionType":
      contextValue = context.detectionType || "";
      break;
    case "consecutiveDetections":
      contextValue = context.consecutiveDetections ?? 1;
      break;
    case "ctiMatch":
      contextValue = Boolean(context.ctiMatch);
      break;
    case "ctiConfidence":
      contextValue = context.ctiConfidence ?? 0;
      break;
    case "maliciousIocMatch":
      contextValue = Boolean(context.maliciousIocMatch);
      break;
    case "affectedEndpointCount":
      contextValue = context.affectedEndpointCount ?? 1;
      break;
    case "crossEndpointAttack":
      contextValue = Boolean(context.crossEndpointAttack);
      break;
    case "endpointStatus":
      contextValue = context.endpointStatus || "ONLINE";
      break;
    default:
      return false;
  }

  const targetValue = cond.value;

  switch (cond.operator) {
    case "EQUALS":
      if (typeof targetValue === "boolean") {
        return Boolean(contextValue) === Boolean(targetValue);
      }
      if (typeof targetValue === "number") {
        return Number(contextValue) === Number(targetValue);
      }
      return String(contextValue).toUpperCase() === String(targetValue).toUpperCase();

    case "NOT_EQUALS":
      if (typeof targetValue === "boolean") {
        return Boolean(contextValue) !== Boolean(targetValue);
      }
      if (typeof targetValue === "number") {
        return Number(contextValue) !== Number(targetValue);
      }
      return String(contextValue).toUpperCase() !== String(targetValue).toUpperCase();

    case "GREATER_THAN":
      return Number(contextValue) > Number(targetValue);

    case "GREATER_THAN_OR_EQUAL":
      return Number(contextValue) >= Number(targetValue);

    case "LESS_THAN":
      return Number(contextValue) < Number(targetValue);

    case "LESS_THAN_OR_EQUAL":
      return Number(contextValue) <= Number(targetValue);

    case "IN":
      if (Array.isArray(targetValue)) {
        return targetValue
          .map((v) => String(v).toUpperCase())
          .includes(String(contextValue).toUpperCase());
      }
      return false;

    case "CONTAINS":
      return String(contextValue).toLowerCase().includes(String(targetValue).toLowerCase());

    default:
      return false;
  }
}

export async function evaluatePolicies(context: PolicyEvaluationContext): Promise<PolicyDocument[]> {
  const { organizationId } = context;

  // Retrieve enabled policies sorted by priority (higher priority first)
  const policies = await PolicyModel.find({
    organizationId,
    enabled: true,
  }).sort({ priority: -1, createdAt: 1 });

  if (policies.length === 0) {
    return [];
  }

  const triggeredPolicies: PolicyDocument[] = [];
  const now = new Date();

  for (const policy of policies) {
    // 1. Cooldown Protection
    if (policy.lastTriggeredAt) {
      const elapsedSeconds = (now.getTime() - policy.lastTriggeredAt.getTime()) / 1000;
      if (elapsedSeconds < policy.cooldownPeriodSeconds) {
        continue; // In cooldown, skip execution
      }
    }

    // 2. Evaluate Conditions
    if (policy.conditions.length === 0) {
      continue;
    }

    let policyMatched = false;
    if (policy.logicalOperator === "OR") {
      policyMatched = policy.conditions.some((cond) => evaluateCondition(cond, context));
    } else {
      // Default to AND
      policyMatched = policy.conditions.every((cond) => evaluateCondition(cond, context));
    }

    if (!policyMatched) {
      continue;
    }

    // 3. Execute Actions
    for (const action of policy.actions) {
      if (action.type === "ISOLATE_ENDPOINT") {
        // Execute safe isolation on target endpoint if not already isolated
        if (context.endpointStatus !== "ISOLATED" && context.endpointId) {
          await isolateEndpoint(
            organizationId,
            context.endpointId,
            undefined,
            `Automated Response Policy "${policy.name}": Condition satisfied`,
            "AUTOMATED_POLICY",
            policy.name
          );
        }
      } else if (action.type === "MARK_HIGH_RISK" && context.detectionId) {
        // Escalate detection severity if applicable
        await DetectionModel.updateOne(
          { _id: context.detectionId, organizationId },
          { severity: "CRITICAL" }
        );
      }
    }

    // 4. Update Policy Execution State
    policy.lastTriggeredAt = now;
    policy.triggerCount += 1;
    await policy.save();

    triggeredPolicies.push(policy);

    // 5. Record Timeline Event
    if (context.endpointId) {
      await recordTimelineEvent({
        organizationId: new Types.ObjectId(organizationId),
        endpointId: new Types.ObjectId(context.endpointId),
        endpointName: context.endpointName,
        detectionId: context.detectionId ? new Types.ObjectId(context.detectionId) : undefined,
        eventType: "POLICY_TRIGGERED",
        actorType: "AUTOMATED_POLICY",
        actorName: policy.name,
        message: `Automated policy "${policy.name}" triggered: ${policy.actions
          .map((a) => a.type)
          .join(", ")} executed`,
        metadata: {
          policyId: policy._id.toString(),
          policyName: policy.name,
          logicalOperator: policy.logicalOperator,
          conditions: policy.conditions,
          actions: policy.actions,
          cooldownPeriodSeconds: policy.cooldownPeriodSeconds,
          context: {
            riskScore: context.riskScore,
            severity: context.severity,
            ctiMatch: context.ctiMatch,
            crossEndpointAttack: context.crossEndpointAttack,
            affectedEndpointCount: context.affectedEndpointCount,
          },
        },
      });
    }

    // 6. Emit real-time WebSocket event
    emitToOrganization(organizationId, "policy:triggered", {
      policyId: policy._id.toString(),
      policyName: policy.name,
      endpointId: context.endpointId,
      endpointName: context.endpointName,
      actions: policy.actions,
      timestamp: now.toISOString(),
    });
  }

  return triggeredPolicies;
}

export async function createPolicy(
  organizationId: string,
  input: {
    name: string;
    description?: string;
    enabled?: boolean;
    priority?: number;
    logicalOperator?: "AND" | "OR";
    conditions: any[];
    actions: any[];
    cooldownPeriodSeconds?: number;
  },
  userId?: string
) {
  if (!input.name || input.name.trim().length === 0) {
    throw new AppError("Policy name is required", 400);
  }

  if (!input.conditions || input.conditions.length === 0) {
    throw new AppError("Policy must contain at least one condition", 400);
  }

  if (!input.actions || input.actions.length === 0) {
    throw new AppError("Policy must contain at least one action", 400);
  }

  const policy = await PolicyModel.create({
    organizationId,
    name: input.name.trim(),
    description: input.description?.trim(),
    enabled: input.enabled ?? true,
    priority: input.priority ?? 10,
    logicalOperator: input.logicalOperator || "AND",
    conditions: input.conditions,
    actions: input.actions,
    cooldownPeriodSeconds: input.cooldownPeriodSeconds ?? 300,
    createdByUserId: userId ? new Types.ObjectId(userId) : undefined,
  });

  return policy;
}

export async function listPolicies(organizationId: string) {
  return PolicyModel.find({ organizationId }).sort({ priority: -1, createdAt: -1 });
}

export async function getPolicyById(organizationId: string, policyId: string) {
  if (!Types.ObjectId.isValid(policyId)) {
    throw new AppError("Invalid policy ID", 400);
  }

  const policy = await PolicyModel.findOne({ _id: policyId, organizationId });
  if (!policy) {
    throw new AppError("Policy not found", 404);
  }

  return policy;
}

export async function updatePolicy(
  organizationId: string,
  policyId: string,
  input: Partial<{
    name: string;
    description: string;
    enabled: boolean;
    priority: number;
    logicalOperator: "AND" | "OR";
    conditions: any[];
    actions: any[];
    cooldownPeriodSeconds: number;
  }>,
  userId?: string
) {
  const policy = await getPolicyById(organizationId, policyId);

  if (input.name !== undefined) policy.name = input.name.trim();
  if (input.description !== undefined) policy.description = input.description.trim();
  if (input.enabled !== undefined) policy.enabled = input.enabled;
  if (input.priority !== undefined) policy.priority = input.priority;
  if (input.logicalOperator !== undefined) policy.logicalOperator = input.logicalOperator;
  if (input.conditions !== undefined) policy.conditions = input.conditions;
  if (input.actions !== undefined) policy.actions = input.actions;
  if (input.cooldownPeriodSeconds !== undefined) policy.cooldownPeriodSeconds = input.cooldownPeriodSeconds;
  if (userId) policy.updatedByUserId = new Types.ObjectId(userId);

  await policy.save();
  return policy;
}

export async function togglePolicy(organizationId: string, policyId: string, enabled?: boolean) {
  const policy = await getPolicyById(organizationId, policyId);
  policy.enabled = enabled !== undefined ? enabled : !policy.enabled;
  await policy.save();
  return policy;
}

export async function deletePolicy(organizationId: string, policyId: string) {
  const policy = await getPolicyById(organizationId, policyId);
  await PolicyModel.deleteOne({ _id: policy._id });
  return { success: true, policyId };
}
