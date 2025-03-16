import baileys from "@/baileys";
import config from "@/config";
import adminController from "@/controller/admin";
import connectionsController from "@/controller/connections";
import logger from "@/lib/logger";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";

const app = new Elysia()
  .onError(({ path, error, code }) => {
    logger.error("%s\n%s", path, (error as Error).stack);
    switch (code) {
      case "INTERNAL_SERVER_ERROR": {
        const message =
          config.env === "development" ? error.stack : "Something went wrong";
        logger.error("%s\n%s", path, error.stack);
        return new Response(message, { status: 500 });
      }
      default:
    }
  })
  .use(
    swagger({
      documentation: {
        info: {
          title: config.packageInfo.name,
          version: config.packageInfo.version,
        },
        tags: [
          {
            name: "Connections",
            description: "Manage connections",
          },
          {
            name: "Admin",
            description: "Admin operations",
          },
        ],
        components: {
          securitySchemes: {
            xApiKey: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
              description: "API key. See scripts/manage-api-keys.ts",
            },
          },
        },
      },
    }),
  )
  .use(connectionsController)
  .use(adminController)
  .listen(config.port);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

baileys.reconnectFromAuthStore().catch((e) => {
  logger.error("Failed to reconnect from auth store: %s", e.stack);
});
