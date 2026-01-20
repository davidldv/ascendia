import cors from "@fastify/cors";
import "dotenv/config";
import Fastify from "fastify";

import { getEnv } from "./env";
import { registerRoutes } from "./routes";

async function main() {
  const env = getEnv();

  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.get("/health", async () => {
    return { ok: true };
  });

  app.get("/", async () => {
    return { name: "ascendia-api", ok: true };
  });

  await registerRoutes(app);

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err) => {
  // Fastify logger isn't available if startup fails.
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
