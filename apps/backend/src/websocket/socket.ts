import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";

let io: SocketIOServer | null = null;

interface AuthenticatedSocket extends Socket {
  organizationId?: string;
}

/**
 * Initializes Socket.IO on top of the same HTTP server Express uses,
 * rather than a separate port - one server, one port, simpler deployment.
 * Every connecting client must authenticate with a valid JWT access token
 * (same one used for REST calls) and is placed into a room scoped to
 * their organizationId, so orgs never see each other's real-time events -
 * mirrors the same tenant isolation the REST API already enforces.
 */
export function initializeSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Missing authentication token"));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.organizationId = payload.organizationId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const room = `org:${socket.organizationId}`;
    socket.join(room);
    console.log(`[websocket] Client connected, joined room: ${room}`);

    socket.on("disconnect", () => {
      console.log(`[websocket] Client disconnected from room: ${room}`);
    });
  });

  return io;
}

/**
 * Emits an event to every client in a specific organization's room. Safe
 * to call even if no clients are connected - Socket.IO just no-ops.
 * Also safe to call before initializeSocketServer() has run (e.g. during
 * tests) - logs a warning instead of crashing the request that triggered it.
 */
export function emitToOrganization(organizationId: string, event: string, payload: unknown) {
  if (!io) {
    console.warn(`[websocket] Attempted to emit "${event}" before socket server was initialized`);
    return;
  }
  io.to(`org:${organizationId}`).emit(event, payload);
}