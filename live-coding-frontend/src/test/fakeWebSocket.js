import { vi } from "vitest";

// WebSocket tiruan yang bisa dikemudikan tes: pesan yang dikirim dicatat, dan
// tes memicu sendiri onopen/onmessage/onclose. Tidak ada koneksi sungguhan.
export class FakeWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }

  send(raw) {
    this.sent.push(JSON.parse(raw));
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  // --- dikemudikan dari tes ---
  buka() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  terima(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  tutup(code = 1006) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code });
  }

  pesanBertipe(type) {
    return this.sent.filter((m) => m.type === type);
  }

  static terakhir() {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  static reset() {
    FakeWebSocket.instances = [];
  }
}

export function pasangFakeWebSocket() {
  FakeWebSocket.reset();
  vi.stubGlobal("WebSocket", FakeWebSocket);
}
