import { useRedisAuthState } from "@/baileys/redisAuthState";
import config from "@/config";
import logger, { baileysLogger } from "@/lib/logger";
import type { Boom } from "@hapi/boom";
import makeWASocket, {
  type BaileysEventMap,
  type WAPresence,
  type ConnectionState,
  Browsers,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { toDataURL } from "qrcode";

export interface BaileysConnectionOptions {
  clientName?: string;
  phoneNumber: string;
  webhookUrl: string;
  webhookVerifyToken: string;
  onConnectionClose?: () => void;
}

export class BaileysAlreadyConnectedError extends Error {
  constructor() {
    super("Phone number already connected");
  }
}
export class BaileysNotConnectedError extends Error {
  constructor() {
    super("Phone number not connected");
  }
}

export class BaileysConnection {
  private clientName: string;
  private phoneNumber: string;
  private webhookUrl: string;
  private webhookVerifyToken: string;
  private onConnectionClose: (() => void) | null;
  private socket: ReturnType<typeof makeWASocket> | null;

  constructor(options: BaileysConnectionOptions) {
    this.clientName = options.clientName || "Chrome";
    this.phoneNumber = options.phoneNumber;
    this.webhookUrl = options.webhookUrl;
    this.webhookVerifyToken = options.webhookVerifyToken;
    this.onConnectionClose = options.onConnectionClose || null;
    this.socket = null;
  }

  async connect() {
    if (this.socket) {
      throw new BaileysAlreadyConnectedError();
    }

    const { state, saveCreds } = await useRedisAuthState(this.phoneNumber, {
      clientName: this.clientName,
      webhookUrl: this.webhookUrl,
      webhookVerifyToken: this.webhookVerifyToken,
    });
    this.socket = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger: baileysLogger,
      browser: Browsers.windows(this.clientName),
      // TODO: Remove this and drop qrcode-terminal dependency.
      printQRInTerminal: config.baileys.printQr,
    });

    this.socket.ev.on("creds.update", saveCreds);
    this.socket.ev.on("connection.update", (event) =>
      this.handleConnectionUpdate(event),
    );
    this.socket.ev.on("messages.upsert", (event) =>
      this.handleMessagesUpsert(event),
    );
    this.socket.ev.on("messages.update", (event) =>
      this.handleMessagesUpdate(event),
    );
    this.socket.ev.on("message-receipt.update", (event) =>
      this.handleMessageReceiptUpdate(event),
    );
  }

  private async close() {
    await this.socket?.authState.keys.clear?.();
    this.socket = null;
    this.onConnectionClose?.();
  }

  async logout() {
    if (!this.socket) {
      throw new BaileysNotConnectedError();
    }

    await this.socket.logout();
    await this.close();
  }

  sendPresenceUpdate(type: WAPresence, toJid?: string | undefined) {
    if (!this.socket) {
      throw new BaileysNotConnectedError();
    }

    return this.socket.sendPresenceUpdate(type, toJid);
  }

  private async handleConnectionUpdate(data: Partial<ConnectionState>) {
    const { connection, qr, lastDisconnect } = data;

    if (connection === "close") {
      // TODO: Drop @hapi/boom dependency.
      const error = lastDisconnect?.error as Boom;
      const statusCode = error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        this.socket = null;
        this.connect();
        return;
      }
      await this.close();
    }

    if (connection === "open" && this.socket?.user?.id) {
      const phoneNumberFromId = `+${this.socket.user.id.split("@")[0].split(":")[0]}`;
      if (phoneNumberFromId !== this.phoneNumber) {
        this.handleWrongPhoneNumber();
        return;
      }
    }

    if (qr) {
      Object.assign(data, { qrDataUrl: await toDataURL(qr) });
    }

    this.sendToWebhook({
      event: "connection.update",
      data,
    });
  }

  private handleMessagesUpsert(data: BaileysEventMap["messages.upsert"]) {
    this.sendToWebhook({
      event: "messages.upsert",
      data,
    });
  }

  private handleMessagesUpdate(data: BaileysEventMap["messages.update"]) {
    this.sendToWebhook({
      event: "messages.update",
      data,
    });
  }

  private handleMessageReceiptUpdate(
    data: BaileysEventMap["message-receipt.update"],
  ) {
    this.sendToWebhook({
      event: "message-receipt.update",
      data,
    });
  }

  private handleWrongPhoneNumber() {
    this.sendToWebhook({
      event: "connection.update",
      data: { error: "WRONG_PHONE_NUMBER" },
    });
    this.socket?.ev.removeAllListeners("connection.update");
    this.logout();
  }

  private async sendToWebhook(data: Record<string, unknown>) {
    try {
      await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          webhookVerifyToken: this.webhookVerifyToken,
        }),
      });
    } catch (error) {
      logger.error("Failed to send to webhook %o", error);
    }
  }
}
