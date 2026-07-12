import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env, getDeployBaseUrl } from "./config/env.js";

async function main() {
  await connectDB();

  const app = createApp();

  app.listen(env.PORT, () => {
    const localBase = `http://localhost:${env.PORT}`;
    const deployBase = getDeployBaseUrl();

    console.log(`API docs (local):  ${localBase}/api/docs`);
    if (deployBase && deployBase !== localBase) {
      console.log(`API docs (server): ${deployBase}/api/docs`);
    }
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
