import { Request, Response } from "express";
import {
  registerOrganization,
  loginUser,
  rotateRefreshToken,
  logoutUser,
} from "../services/auth.service";
import { AppError } from "../middleware/error.middleware";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
};

export async function register(req: Request, res: Response) {
  const { organizationName, adminName, email, password } = req.body;

  if (!organizationName || !adminName || !email || !password) {
    throw new AppError("All fields are required", 400);
  }
  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const { organization, user } = await registerOrganization({
    organizationName,
    adminName,
    email,
    password,
  });

  res.status(201).json({
    message: "Organization registered successfully",
    organizationId: organization._id,
    userId: user._id,
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const { user, accessToken, refreshToken } = await loginUser(email, password);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    throw new AppError("No refresh token provided", 401);
  }

  const { accessToken, refreshToken } = await rotateRefreshToken(token);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ accessToken });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    await logoutUser(token);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.status(200).json({ message: "Logged out successfully" });
}