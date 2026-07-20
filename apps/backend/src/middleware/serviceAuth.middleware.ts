import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "./error.middleware";

/**
 * Authenticates machine-to-machine calls (the ML service pushing a new
 * detection) using a shared API key rather than a user JWT — the ML
 * service is not a logged-in user and has no organization-scoped session.
 * The organizationId/endpointId for the detection must instead be supplied
 * in the request body, and the caller (ML service) is trusted to have
 * correctly resolved which endpoint/org an event belongs to.
 */
export function requireServiceApiKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"];
  if (!key || key !== env.mlServiceApiKey) {
    throw new AppError("Invalid or missing service API key", 401);
  }
  next();
}