import WebSocket from "ws";
import { SocketPayload } from "./types";

type Handlers = {
  onOpen: () => void;
  onMessage: (message: SocketPayload) => void;
  onClose: () => void;
  onError: (error: Error) => void;
};

let socket: WebSocket | null = null;

export function connectSocket(url: string, handlers: Handlers) {
  disconnectSocket();

  const ws = new WebSocket(url);
  socket = ws;

  ws.on("open", handlers.onOpen);
  ws.on("close", handlers.onClose);
  ws.on("error", (error) => handlers.onError(error as Error));
  ws.on("message", (raw) => {
    try {
      handlers.onMessage(JSON.parse(raw.toString()));
    } catch {
      // Abaikan pesan backend yang bukan JSON.
    }
  });
}

export function sendMessage(payload: SocketPayload): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(payload));
  return true;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.on("error", () => {});
    socket.close();
  }
  socket = null;
}

export function isConnected(): boolean {
  return socket !== null;
}
