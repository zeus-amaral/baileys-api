import logger, { baileysLogger } from "@/logger";
import type { Boom } from "@hapi/boom";
import makeWASocket, {
  type BaileysEventMap,
  Browsers,
  type ConnectionState,
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { toDataURL } from "qrcode";

// biome-ignore lint/correctness/noNodejsModules: <explanation>
import { rm } from "node:fs/promises";
import { phoneNumberFromId } from "@/baileys/utils";

export interface BaileysConnectionOptions {
  clientName?: string;
  phoneNumber: string;
  webhookUrl: string;
  webhookSecret: string;
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
  private webhookSecret: string;
  private onConnectionClose: (() => void) | null;
  private socket: ReturnType<typeof makeWASocket> | null;

  constructor(options: BaileysConnectionOptions) {
    this.clientName = options.clientName || "Chrome";
    this.phoneNumber = options.phoneNumber;
    this.webhookUrl = options.webhookUrl;
    this.webhookSecret = options.webhookSecret;
    this.onConnectionClose = options.onConnectionClose || null;
    this.socket = null;
  }

  async connect() {
    if (this.socket) {
      throw new BaileysAlreadyConnectedError();
    }

    const { state, saveCreds } = await useMultiFileAuthState("auth");
    this.socket = makeWASocket({
      auth: state,
      logger: baileysLogger,
      browser: Browsers.windows(this.clientName),
      printQRInTerminal: true,
    });

    this.socket.ev.on("creds.update", (creds) => {
      if (creds.me?.id && this.phoneNumber !== phoneNumberFromId(creds.me.id)) {
        // TODO: Reconnect so WhatsApp receives login request
        this.handleWrongPhoneNumber();
        return;
      }

      saveCreds();
    });
    this.socket.ev.on("connection.update", (event) =>
      this.handleConnectionUpdate(event),
    );
    // sock.ev.on("messages.upsert", (event) => this.handleMessagesUpsert(event));
    // sock.ev.on("messages.update", (event) => this.handleMessagesUpdate(event));
    // sock.ev.on("message-receipt.update", (event) =>
    //   this.handleMessageReceiptUpdate(event),
    // );
  }

  status() {
    if (!this.socket) {
      throw new BaileysNotConnectedError();
    }

    return { connected: this.socket?.ws.isOpen };
  }

  async logout() {
    if (!this.socket) {
      throw new BaileysNotConnectedError();
    }

    await this.socket.logout();
    this.socket = null;
    this.onConnectionClose?.();
  }

  private async handleConnectionUpdate(event: Partial<ConnectionState>) {
    const { connection, isNewLogin, qr, lastDisconnect } = event;

    if (connection === "close") {
      const error = lastDisconnect?.error as Boom;
      const statusCode = error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      this.socket = null;
      if (shouldReconnect) {
        this.connect();
        return;
      }
      await rm("auth", { recursive: true, force: true });
      this.onConnectionClose?.();
    }

    if (qr) {
      this.sendToWebhook({
        event: "connection.update",
        payload: { status: "SETUP_NEEDED", qrcode: await toDataURL(qr) },
      });
    } else if (isNewLogin || connection === "open" || connection === "close") {
      let status = "SETUP_NEEDED";
      if (isNewLogin) {
        status = "CONNECTING";
      } else if (connection === "open") {
        status = "AVAILABLE";
      }
      this.sendToWebhook({
        event: "connection.update",
        payload: { status },
      });
    }
  }

  private handleMessagesUpsert(event: BaileysEventMap["messages.upsert"]) {
    const { messages } = event;

    this.sendToWebhook({
      event: "messages.upsert",
      payload: { messages },
    });
  }

  private handleMessagesUpdate(event: BaileysEventMap["messages.update"]) {
    this.sendToWebhook({
      event: "messages.update",
      payload: { updates: event },
    });
  }

  private handleMessageReceiptUpdate(
    event: BaileysEventMap["message-receipt.update"],
  ) {
    this.sendToWebhook({
      event: "message-receipt.update",
      payload: { updates: event },
    });
  }

  private handleWrongPhoneNumber() {
    this.sendToWebhook({
      event: "connection.update",
      payload: { status: "WRONG_PHONE_NUMBER" },
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
        body: JSON.stringify({ ...data, webhookSecret: this.webhookSecret }),
      });
    } catch (error) {
      logger.error("Failed to send to webhook", error);
    }
  }
}
