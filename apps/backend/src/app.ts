import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import endpointRoutes from "./routes/endpoint.routes";
import auditLogRoutes from "./routes/auditLog.routes";
import { errorMiddleware } from "./middleware/error.middleware";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/endpoints", endpointRoutes);
  app.use("/api/audit-logs", auditLogRoutes);

  app.use(errorMiddleware);

  return app;
}