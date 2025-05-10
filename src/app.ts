import config from "@/config";
import adminController from "@/controllers/admin";
import connectionsController from "@/controllers/connections";
import statusController from "@/controllers/status";
import logger from "@/lib/logger";
import swagger from "@elysiajs/swagger";
import Elysia from "elysia";

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
          description: config.packageInfo.description,
        },
        servers: [
          {
            url: `http://localhost:${config.port}`,
            description: "Local development server",
          },
          {
            url: "{scheme}://{customUrl}",
            description: "Custom server",
            variables: {
              scheme: {
                enum: ["http", "https"],
                default: "https",
                description: "HTTP or HTTPS",
              },
              customUrl: {
                default: "your-domain.com",
                description: "Your API domain (without protocol)",
              },
            },
          },
        ],
        tags: [
          {
            name: "Status",
            description: "Fetch server status",
          },
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
  .use(statusController)
  .use(adminController)
  .use(connectionsController);

// biome-ignore lint/style/noDefaultExport: <explanation>
export default app;
