import baileys from "@/baileys";
import { BaileysAlreadyConnectedError } from "@/baileys/connection";
import { phoneNumberParams } from "@/controller/common";
import { authMiddleware } from "@/middleware/auth";
import Elysia, { t } from "elysia";

const connectionsController = new Elysia({
  prefix: "/connections",
  detail: {
    tags: ["Connections"],
    security: [{ xApiKey: [] }],
  },
})
  // TODO: Use auth data to limit access to existing connections.
  .use(authMiddleware)
  .post(
    "/:phoneNumber",
    async ({ params, body }) => {
      const { phoneNumber } = params;
      const { clientName, webhookUrl, webhookVerifyToken } = body;
      try {
        await baileys.connect({
          clientName,
          phoneNumber,
          webhookUrl,
          webhookVerifyToken,
        });
      } catch (e) {
        if (e instanceof BaileysAlreadyConnectedError) {
          await baileys.sendPresenceUpdate(phoneNumber, {
            type: "available",
          });
        }
      }
    },
    {
      params: phoneNumberParams,
      body: t.Object({
        clientName: t.Optional(
          t.String({
            minLength: 1,
            description: "Name of the client to be used on WhatsApp connection",
          }),
        ),
        webhookUrl: t.String({
          format: "uri",
          description: "URL for receiving updates",
        }),
        webhookVerifyToken: t.String({
          minLength: 1,
          description: "Token for verifying webhook",
        }),
      }),
    },
  )
  .delete(
    "/:phoneNumber",
    async ({ params }) => {
      const { phoneNumber } = params;
      await baileys.logout(phoneNumber);
    },
    {
      params: phoneNumberParams,
    },
  );

// biome-ignore lint/style/noDefaultExport: <explanation>
export default connectionsController;
