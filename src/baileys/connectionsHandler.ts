import {
  BaileysAlreadyConnectedError,
  BaileysConnection,
  type BaileysConnectionOptions,
  BaileysNotConnectedError,
} from "@/baileys/connection";

export class BaileysConnectionsHandler {
  private connections: Record<string, BaileysConnection> = {};

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

  status(phoneNumber: string) {
    const connection = this.connections[phoneNumber];
    if (!connection) {
      throw new BaileysNotConnectedError();
    }

    return connection.status();
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
