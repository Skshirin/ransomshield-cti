import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function start() {
  await connectDatabase();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[server] Listening on http://localhost:${env.port}`);
  });
}

start();