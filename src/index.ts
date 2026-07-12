import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { env, getPublicBaseUrl, getSwaggerDocsUrl } from "./config/env.js";

async function main() {
  await connectDB();

  const app = createApp();

  app.listen(env.PORT, () => {
    const publicUrl = getPublicBaseUrl();
    console.log(`Server running on ${publicUrl}`);
    console.log(`Swagger docs:  ${getSwaggerDocsUrl()}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
