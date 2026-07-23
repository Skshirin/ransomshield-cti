import http from "http";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { initializeSocketServer } from "./websocket/socket";

async function start() {
  await connectDatabase();
  const app = createApp();

  // Wrapping Express in a plain http.Server lets Socket.IO attach to the
  // exact same port - no separate WebSocket port to manage or expose.
  const httpServer = http.createServer(app);
  initializeSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`[server] Listening on http://localhost:${env.port}`);
    console.log(`[server] WebSocket server ready on the same port`);
  });
}

start();