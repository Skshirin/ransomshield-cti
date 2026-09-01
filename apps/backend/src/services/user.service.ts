import { Types } from "mongoose";
import { UserModel, UserRole } from "../models/user.model";
import { hashPassword } from "../utils/password";
import { AppError } from "../middleware/error.middleware";

interface InviteUserInput {
  organizationId: string;
  name: string;
  email: string;
  temporaryPassword: string;
  role: UserRole;
}

export async function inviteUser(input: InviteUserInput) {
  const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const passwordHash = await hashPassword(input.temporaryPassword);

  const user = await UserModel.create({
    organizationId: input.organizationId,
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: input.role,
  });

  return user;
}

export async function createInvitationCode(organizationId: string, createdByUserId: string) {
  const { InvitationModel } = await import("../models/invitation.model");
  const crypto = await import("crypto");

  let code = "";
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    // Generate clean 6-character uppercase alphanumeric code
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude easily confused chars (0, O, 1, I)
    const randomBytes = crypto.randomBytes(6);
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[randomBytes[i] % chars.length];
    }
    const existing = await InvitationModel.findOne({ code });
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new AppError("Failed to generate a unique invitation code. Please try again.", 500);
  }

  const invitation = await InvitationModel.create({
    code,
    organizationId,
    createdBy: createdByUserId,
  });

  return invitation;
}

export async function listOrganizationInvitations(organizationId: string) {
  const { InvitationModel } = await import("../models/invitation.model");
  return InvitationModel.find({ organizationId })
    .populate("createdBy", "name email")
    .populate("consumedBy", "name email")
    .sort({ createdAt: -1 });
}

export async function listOrganizationUsers(organizationId: string) {
  return UserModel.find({ organizationId }).select("-passwordHash");
}

export async function getUserById(organizationId: string, userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError("Invalid user ID", 400);
  }
  const user = await UserModel.findOne({ _id: userId, organizationId }).select("-passwordHash");
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
}

export async function updateUserRole(
  organizationId: string,
  targetUserId: string,
  requestingUserId: string,
  newRole: UserRole
) {
  if (targetUserId === requestingUserId) {
    throw new AppError("You cannot change your own role", 400);
  }

  const user = await UserModel.findOne({ _id: targetUserId, organizationId });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.role = newRole;
  await user.save();
  return user;
}

export async function deactivateUser(
  organizationId: string,
  targetUserId: string,
  requestingUserId: string
) {
  if (targetUserId === requestingUserId) {
    throw new AppError("You cannot deactivate your own account", 400);
  }

  const user = await UserModel.findOne({ _id: targetUserId, organizationId });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.isActive = false;
  await user.save();
  return user;
}

export async function reactivateUser(organizationId: string, targetUserId: string) {
  const user = await UserModel.findOne({ _id: targetUserId, organizationId });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  user.isActive = true;
  await user.save();
  return user;
}