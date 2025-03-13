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
    async ({ body, error }) => {
      const { clientName, phoneNumber, webhookUrl, webhookSecret } = body;

      try {
        await baileys.connect({
          clientName,
          phoneNumber,
          webhookUrl,
          webhookSecret,
        });
      } catch (e) {
        if (e instanceof BaileysAlreadyConnectedError) {
          return error(409, { message: e.message });
        }
      }
    },
    {
      body: t.Object({
        clientName: t.Optional(t.String()),
        phoneNumber: t.String(),
        webhookUrl: t.String(),
        webhookSecret: t.String(),
      }),
    },
  )
  .get(
    "/connections/:phoneNumber",
    ({ params, error }) => {
      const { phoneNumber } = params;

      try {
        logger.info(`Checking status of ${phoneNumber}`);
        const status = baileys.status(phoneNumber);
        logger.info(`Status of ${phoneNumber}: ${status}`);
        return status;
      } catch (e) {
        if (e instanceof BaileysNotConnectedError) {
          return error(404, { message: e.message });
        }
        throw e;
      }
    },
    {
      params: t.Object({
        phoneNumber: t.String(),
      }),
    },
  )
  .listen(3025);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
