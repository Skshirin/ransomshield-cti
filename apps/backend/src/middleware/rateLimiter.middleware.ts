import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request } from "express";

/**
 * General API Rate Limiter
 * Protects general public/API routes from abuse, but delegates/exempts
 * heartbeat traffic to the dedicated per-endpoint heartbeat limiter.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,                 // Up to 1000 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Exempt heartbeat route so it uses its dedicated per-endpoint rate limiter
    const url = req.originalUrl || req.url || req.path || "";
    return url.includes("/heartbeat");
  },
  message: {
    message: "Too many requests, please try again later.",
  },
});

/**
 * Dedicated Heartbeat Rate Limiter
 * Ensures machine-to-machine heartbeat requests from agents:
 * 1. Are allowed at their normal heartbeat frequency (~9-10s per agent -> ~6-7 req/min).
 * 2. Are bucketed PER ENDPOINT rather than globally/per-IP, so multiple agents on localhost
 *    or the same network never collide or exhaust each other's quotas.
 * 3. Protects backend against excessive / runaway heartbeat floods (> 30 req/min per endpoint).
 */
export const heartbeatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30,             // Max 30 heartbeats/min per endpoint (normal rate is 6-7/min)
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Key by endpoint ID if available in route params
    if (req.params && req.params.id) {
      return `heartbeat:endpoint:${req.params.id}`;
    }
    // Fallback to IP if params are missing for any reason
    return req.ip ? ipKeyGenerator(req.ip) : "heartbeat:unknown";
  },
  message: {
    message: "Too many heartbeat requests for this endpoint, please try again later.",
  },
  statusCode: 429,
});
