const WebSocket = require("ws");
const admin = require("firebase-admin");

const safeJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

class RealtimeService {
  constructor() {
    this.wss = null;
    this.channels = new Map();
  }

  attach(server, app) {
    if (this.wss) return this;

    this.wss = new WebSocket.Server({ server, path: "/ws" });

    this.wss.on("connection", async (socket, req) => {
      socket.channels = new Set();
      socket.isAlive = true;

      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        socket.close(1008, "Authentication required");
        return;
      }

      try {
        socket.user = await admin.auth().verifyIdToken(token);
      } catch {
        socket.close(1008, "Invalid token");
        return;
      }

      socket.on("pong", () => {
        socket.isAlive = true;
      });

      socket.on("message", (raw) => {
        const message = safeJson(raw);
        if (!message || message.type !== "subscribe" || !message.channel) return;
        this.subscribe(socket, String(message.channel));
      });

      socket.on("close", () => this.cleanup(socket));

      socket.send(JSON.stringify({ type: "connected" }));
    });

    const heartbeat = setInterval(() => {
      this.wss.clients.forEach((socket) => {
        if (!socket.isAlive) {
          socket.terminate();
          return;
        }
        socket.isAlive = false;
        socket.ping();
      });
    }, 30000);

    this.wss.on("close", () => clearInterval(heartbeat));
    app.locals.realtime = this;
    console.log("Realtime WebSocket service attached on /ws");
    return this;
  }

  subscribe(socket, channel) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel).add(socket);
    socket.channels.add(channel);
    socket.send(JSON.stringify({ type: "subscribed", channel }));
  }

  cleanup(socket) {
    for (const channel of socket.channels || []) {
      const subscribers = this.channels.get(channel);
      if (!subscribers) continue;
      subscribers.delete(socket);
      if (subscribers.size === 0) this.channels.delete(channel);
    }
  }

  broadcast(channel, event, payload = {}) {
    const subscribers = this.channels.get(channel);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify({
      type: "event",
      channel,
      event,
      payload,
      sentAt: new Date().toISOString(),
    });

    subscribers.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });
  }
}

module.exports = new RealtimeService();
