import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { generalLimiter } from "./middleware/rateLimiter.middleware";
import { env } from "./config/env";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import endpointRoutes from "./routes/endpoint.routes";
import auditLogRoutes from "./routes/auditLog.routes";
import detectionRoutes from "./routes/detection.routes";
import ctiRoutes from "./routes/cti.routes";
import userRoutes from "./routes/user.routes";
import policyRoutes from "./routes/policy.routes";
import cascadeRoutes from "./routes/cascade.routes";
import threatIntelRoutes from "./routes/threatIntel.routes";
import { errorMiddleware } from "./middleware/error.middleware";

export function createApp(): Application {
  const app = express();

  app.use(generalLimiter);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowedOrigins = process.env.CORS_ORIGIN
          ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
          : ["http://localhost:8443", "http://localhost:5173", "http://localhost:3000"];

        if (!origin || env.nodeEnv === "development" || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/endpoints", endpointRoutes);
  app.use("/api/audit-logs", auditLogRoutes);
  app.use("/api/detections", detectionRoutes);
  app.use("/api/cti", ctiRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/policies", policyRoutes);
  app.use("/api/cascades", cascadeRoutes);
  app.use("/api/threat-intel", threatIntelRoutes);

  app.use(errorMiddleware);

  return app;
}