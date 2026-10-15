import WebSocket from "ws";
import { SocketPayload } from "./types";

let socket: WebSocket | null = null;
let connected = false;

export function connectSocket(url: string, onOpen: () => void, onClose?: () => void, onError?: (error: Error) => void) {
  disconnectSocket();

  socket = new WebSocket(url);

  socket.on("open", () => {
    connected = true;
    onOpen();
  });

  socket.on("close", () => {
    connected = false;
    onClose?.();
  });

  socket.on("error", (error) => {
    connected = false;
    onError?.(error as Error);
  });

  socket.on("message", (raw) => {
    // Backend acknowledgements can be handled here later.
    console.log("[Live Coding Classroom] backend:", raw.toString());
  });
}

export function sendMessage(payload: SocketPayload): boolean {
  if (!socket || !connected || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  socket.send(JSON.stringify(payload));
  return true;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.close();
  }

  socket = null;
  connected = false;
}

export function isConnected(): boolean {
  return connected;
}
