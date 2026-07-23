import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  inviteUser,
  listOrganizationUsers,
  getUserById,
  updateUserRole,
  deactivateUser,
  reactivateUser,
} from "../services/user.service";
import { AppError } from "../middleware/error.middleware";

const VALID_ROLES = ["ORG_ADMIN", "SECURITY_ANALYST"];

export async function invite(req: AuthenticatedRequest, res: Response) {
  const { name, email, temporaryPassword, role } = req.body;

  if (!name || !email || !temporaryPassword) {
    throw new AppError("name, email, and temporaryPassword are required", 400);
  }
  if (temporaryPassword.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }
  if (role && !VALID_ROLES.includes(role)) {
    throw new AppError(`role must be one of: ${VALID_ROLES.join(", ")}`, 400);
  }

  const user = await inviteUser({
    organizationId: req.user!.organizationId,
    name,
    email,
    temporaryPassword,
    role: role || "SECURITY_ANALYST",
  });

  res.status(201).json({
    message: "User invited successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

export async function getUsers(req: AuthenticatedRequest, res: Response) {
  const users = await listOrganizationUsers(req.user!.organizationId);
  res.status(200).json({ users });
}

export async function getUser(req: AuthenticatedRequest, res: Response) {
  const user = await getUserById(req.user!.organizationId, req.params.id);
  res.status(200).json({ user });
}

export async function changeRole(req: AuthenticatedRequest, res: Response) {
  const { role } = req.body;
  if (!role || !VALID_ROLES.includes(role)) {
    throw new AppError(`role must be one of: ${VALID_ROLES.join(", ")}`, 400);
  }

  const user = await updateUserRole(
    req.user!.organizationId,
    req.params.id,
    req.user!.userId,
    role
  );

  res.status(200).json({ message: "Role updated", user });
}

export async function deactivate(req: AuthenticatedRequest, res: Response) {
  const user = await deactivateUser(
    req.user!.organizationId,
    req.params.id,
    req.user!.userId
  );
  res.status(200).json({ message: "User deactivated", user });
}

export async function reactivate(req: AuthenticatedRequest, res: Response) {
  const user = await reactivateUser(req.user!.organizationId, req.params.id);
  res.status(200).json({ message: "User reactivated", user });
}