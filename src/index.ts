import baileys from "@/baileys";
import {
  BaileysAlreadyConnectedError,
  BaileysNotConnectedError,
} from "@/baileys/connection";
import config from "@/config";
import logger from "@/logger";
import { Elysia, t } from "elysia";

const app = new Elysia()
  .onError(({ path, error }) => {
    const e = error as Error;
    logger.error("%s\n%s", path, e.stack);
    const message =
      config.env === "development" ? e.stack : "Something went wrong";
    return new Response(message, { status: 500 });
  })
  .post(
    "/connections",
    async ({ body }) => {
      const { clientName, phoneNumber, webhookUrl, webhookVerifyToken } = body;

      try {
        await baileys.connect({
          clientName,
          phoneNumber,
          webhookUrl,
          webhookVerifyToken,
        });
      } catch (e) {
        if (e instanceof BaileysAlreadyConnectedError) {
          await baileys.sendPresenceUpdate(phoneNumber, { type: "available" });
        }
      }
    },
    {
      body: t.Object({
        clientName: t.Optional(t.String()),
        phoneNumber: t.String(),
        webhookUrl: t.String(),
        webhookVerifyToken: t.String(),
      }),
    },
  )
  .listen(3025);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
