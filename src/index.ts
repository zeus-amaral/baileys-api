import baileys from "@/baileys";
import config from "@/config";
import adminController from "@/controller/admin";
import connectionsController from "@/controller/connections";
import logger, { deepSanitizeObject } from "@/lib/logger";
import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";

const app = new Elysia()
  .onAfterResponse(({ request, response, set }) => {
    logger.info(
      "%s %s [%s] %o",
      request.method,
      request.url,
      set.status,
      response ?? {},
    );
  })
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
  `${config.packageInfo.name}@${config.packageInfo.version} running on ${app.server?.hostname}:${app.server?.port}`,
);
logger.info(
  "Loaded config %s",
  JSON.stringify(deepSanitizeObject(config), null, 2),
);

baileys.reconnectFromAuthStore().catch((e) => {
  logger.error("Failed to reconnect from auth store: %s", e.stack);
});
