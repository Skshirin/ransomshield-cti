import dns from "dns";
import mongoose from "mongoose";
import { env } from "./env";

// Workaround for Windows / ISP DNS servers that block or refuse SRV queries (_mongodb._tcp)
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Keep default DNS if custom DNS setting fails
}

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("[database] Connected to MongoDB");
  } catch (error) {
    console.error("[database] Connection failed:", error);
    process.exit(1);
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("[database] MongoDB disconnected");
});