const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getWsUrl = (token) => {
  const url = new URL(apiUrl.replace(/\/api\/?$/, ""));
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  if (token) url.searchParams.set("token", token);
  return url.toString();
};

export const subscribeRealtime = ({ token, channel, onEvent }) => {
  if (!channel) return () => {};

  const socket = new WebSocket(getWsUrl(token));

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "subscribe", channel }));
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "event" && message.channel === channel) {
        onEvent?.(message);
      }
    } catch {
      // Ignore malformed realtime payloads.
    }
  });

  return () => {
    socket.close();
  };
};
