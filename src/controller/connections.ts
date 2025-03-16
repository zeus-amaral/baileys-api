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
            description: "Name of the client to be used on WhatsApp connection",
            examples: ["My WhatsApp Client"],
          }),
        ),
        webhookUrl: t.String({
          format: "uri",
          description: "URL for receiving updates",
          examples: ["http://localhost:3026/whatsapp/+1234567890"],
        }),
        webhookVerifyToken: t.String({
          minLength: 6,
          description: "Token for verifying webhook",
          examples: ["a3f4b2"],
        }),
      }),
      detail: {
        responses: {
          200: {
            description: "Connection initiated",
          },
        },
      },
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
      detail: {
        responses: {
          200: {
            description: "Disconnect initiated",
          },
        },
      },
    },
  );

// biome-ignore lint/style/noDefaultExport: <explanation>
export default connectionsController;
