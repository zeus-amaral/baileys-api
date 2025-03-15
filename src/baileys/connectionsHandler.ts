import {
  BaileysAlreadyConnectedError,
  BaileysConnection,
  type BaileysConnectionOptions,
  BaileysNotConnectedError,
} from "@/baileys/connection";
import { getRedisSavedAuthStateIds } from "@/baileys/redisAuthState";
import logger from "@/lib/logger";
import type { WAPresence } from "@whiskeysockets/baileys";

export class BaileysConnectionsHandler {
  private connections: Record<string, BaileysConnection> = {};

  async reconnectFromAuthStore() {
    const savedConnections =
      await getRedisSavedAuthStateIds<
        Omit<BaileysConnectionOptions, "phoneNumber" | "onConnectionClose">
      >();

    logger.info(
      "Reconnecting from auth store\n%o",
      savedConnections.map(({ id }) => id),
    );

    // TODO: Handle thundering herd issue.
    for (const { id, metadata } of savedConnections) {
      const connection = new BaileysConnection({
        phoneNumber: id,
        onConnectionClose: () => delete this.connections[id],
        ...metadata,
      });
      this.connections[id] = connection;
      await connection.connect();
    }
  }

  async connect(options: BaileysConnectionOptions) {
    const { phoneNumber } = options;
    if (this.connections[phoneNumber]) {
      throw new BaileysAlreadyConnectedError();
    }

    const connection = new BaileysConnection({
      ...options,
      onConnectionClose: () => {
        delete this.connections[phoneNumber];
        options.onConnectionClose?.();
      },
    });
    await connection.connect();
    this.connections[phoneNumber] = connection;
  }

  sendPresenceUpdate(
    phoneNumber: string,
    { type, toJid }: { type: WAPresence; toJid?: string | undefined },
  ) {
    const connection = this.connections[phoneNumber];
    if (!connection) {
      throw new BaileysNotConnectedError();
    }

    return connection.sendPresenceUpdate(type, toJid);
  }

  async logout(phoneNumber: string) {
    const connection = this.connections[phoneNumber];
    if (!connection) {
      throw new BaileysNotConnectedError();
    }

    await connection.logout();
    delete this.connections[phoneNumber];
  }

  async logoutAll() {
    const connections = Object.values(this.connections);
    await Promise.allSettled(connections.map((c) => c.logout()));
    this.connections = {};
  }
}
