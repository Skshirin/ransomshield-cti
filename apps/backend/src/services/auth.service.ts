import { OrganizationModel } from "../models/organization.model";
import { UserModel } from "../models/user.model";
import { SessionModel } from "../models/session.model";
import { hashPassword, comparePassword } from "../utils/password";
import {
  signAccessToken,
  generateOpaqueRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
} from "../utils/jwt";
import { AppError } from "../middleware/error.middleware";

interface RegisterInput {
  organizationName: string;
  adminName: string;
  email: string;
  password: string;
}

export async function registerOrganization(input: RegisterInput) {
  const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  const organization = await OrganizationModel.create({ name: input.organizationName });

  const passwordHash = await hashPassword(input.password);
  const user = await UserModel.create({
    organizationId: organization._id,
    name: input.adminName,
    email: input.email.toLowerCase(),
    passwordHash,
    role: "ORG_ADMIN",
  });

  return { organization, user };
}

interface JoinInput {
  name: string;
  email: string;
  password: string;
  invitationCode: string;
}

export async function joinOrganizationWithInviteCode(input: JoinInput) {
  const { InvitationModel } = await import("../models/invitation.model");

  if (!input.invitationCode || input.invitationCode.trim().length !== 6) {
    throw new AppError("Invitation code must be exactly 6 characters", 400);
  }

  const codeUpper = input.invitationCode.trim().toUpperCase();

  // Atomically find an unconsumed invitation code
  const invitation = await InvitationModel.findOne({
    code: codeUpper,
    isConsumed: false,
  });

  if (!invitation) {
    throw new AppError("Invalid or consumed invitation code", 400);
  }

  const existingUser = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (existingUser) {
    throw new AppError("Email already registered", 409);
  }

  const passwordHash = await hashPassword(input.password);

  // Create SECURITY_ANALYST user associated with invitation's organization
  const user = await UserModel.create({
    organizationId: invitation.organizationId,
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: "SECURITY_ANALYST",
    isActive: true,
  });

  // Mark invitation as consumed atomically
  invitation.isConsumed = true;
  invitation.consumedBy = user._id;
  invitation.consumedAt = new Date();
  await invitation.save();

  return { user };
}

export async function loginUser(email: string, password: string) {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash"
  );

  if (!user || !user.isActive) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    organizationId: user.organizationId.toString(),
    role: user.role,
  });

  const refreshToken = generateOpaqueRefreshToken();
  await SessionModel.create({
    userId: user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: refreshExpiryDate(),
  });

  return { user, accessToken, refreshToken };
}

export async function rotateRefreshToken(oldRefreshToken: string) {
  const hashed = hashRefreshToken(oldRefreshToken);
  const session = await SessionModel.findOne({ refreshTokenHash: hashed });

  if (!session || session.expiresAt < new Date()) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await UserModel.findById(session.userId);
  if (!user || !user.isActive) {
    throw new AppError("User no longer active", 401);
  }

  // Rotation: delete old session, issue a brand new refresh token.
  await session.deleteOne();

  const newRefreshToken = generateOpaqueRefreshToken();
  await SessionModel.create({
    userId: user._id,
    refreshTokenHash: hashRefreshToken(newRefreshToken),
    expiresAt: refreshExpiryDate(),
  });

  const accessToken = signAccessToken({
    userId: user._id.toString(),
    organizationId: user.organizationId.toString(),
    role: user.role,
  });

  return { user, accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(refreshToken: string) {
  const hashed = hashRefreshToken(refreshToken);
  await SessionModel.deleteOne({ refreshTokenHash: hashed });
}