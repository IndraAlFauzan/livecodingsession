import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import useLiveSession from "./useLiveSession.js";
import { FakeWebSocket, pasangFakeWebSocket } from "../test/fakeWebSocket.js";

const TANDA_SESI = "tanda-sesi-123";

const init = (ubahan = {}) => ({
  type: "session:init",
  course: { slug: "pemrograman-mobile", name: "Pemrograman Mobile" },
  meeting: { id: "p1", number: 1, title: "Provider", status: "live", continuesFrom: null },
  tree: [
    {
      name: "lib",
      path: "lib",
      type: "folder",
      children: [
        { name: "a.dart", path: "lib/a.dart", type: "file" },
        { name: "b.dart", path: "lib/b.dart", type: "file" },
      ],
    },
  ],
  activeFile: "lib/a.dart",
  changes: {},
  hasTeacher: true,
  selection: null,
  ...ubahan,
});

function pasang(props = {}) {
  const onAccessRevoked = vi.fn();
  const onSessionExpired = vi.fn();
  const hasil = renderHook(() =>
    useLiveSession({ meetingId: "p1", token: TANDA_SESI, onAccessRevoked, onSessionExpired, ...props }),
  );
  return { ...hasil, onAccessRevoked, onSessionExpired, ws: FakeWebSocket.terakhir() };
}

beforeEach(() => pasangFakeWebSocket());
afterEach(() => vi.unstubAllGlobals());

describe("penyambungan", () => {
  it("mengirim student:join dengan tanda sesi saat koneksi terbuka", () => {
    const { ws } = pasang();
    act(() => ws.buka());

    expect(ws.pesanBertipe("student:join")[0]).toMatchObject({
      meetingId: "p1",
      studentToken: TANDA_SESI,
    });
  });

  // Nama diambil server dari akun pemilik tanda sesi. Kalau klien ikut
  // mengirimkannya, celah menyamar jadi orang lain terbuka lagi.
  it("tidak mengirim nama maupun kode kelas", () => {
    const { ws } = pasang();
    act(() => ws.buka());

    const join = ws.pesanBertipe("student:join")[0];
    expect(join.studentName).toBeUndefined();
    expect(join.accessCode).toBeUndefined();
  });

  it("status koneksi mengikuti keadaan socket", async () => {
    const { result, ws } = pasang();
    expect(result.current.connectionStatus).toBe("connecting");
    act(() => ws.buka());
    expect(result.current.connectionStatus).toBe("connected");
    act(() => ws.tutup());
    await waitFor(() => expect(result.current.connectionStatus).toBe("disconnected"));
  });
});

describe("session:init", () => {
  it("mengisi pertemuan, tree, dan memilih file yang dibuka dosen", () => {
    const { result, ws } = pasang();
    act(() => ws.buka());
    act(() => ws.terima(init()));

    expect(result.current.meeting).toMatchObject({ number: 1, title: "Provider" });
    expect(result.current.tree).toHaveLength(1);
    expect(result.current.activeFile).toBe("lib/a.dart");
    expect(result.current.selectedFile).toBe("lib/a.dart");
  });
});

describe("Follow Dosen", () => {
  it("ikut berpindah saat follow menyala", () => {
    const { result, ws } = pasang();
    act(() => ws.buka());
    act(() => ws.terima(init()));
    act(() => ws.terima({ type: "teacher:active-file", path: "lib/b.dart" }));

    expect(result.current.selectedFile).toBe("lib/b.dart");
  });

  it("tidak ikut berpindah saat follow dimatikan, tapi tetap mencatat file dosen", () => {
    const { result, ws } = pasang();
    act(() => ws.buka());
    act(() => ws.terima(init()));
    act(() => result.current.setFollowTeacher(false));
    act(() => ws.terima({ type: "teacher:active-file", path: "lib/b.dart" }));

    expect(result.current.selectedFile).toBe("lib/a.dart");
    expect(result.current.activeFile).toBe("lib/b.dart");
  });
});

describe("dosen terputus", () => {
  it("teacher:waiting menandai menunggu tanpa mengakhiri pertemuan", () => {
    const { result, ws } = pasang();
    act(() => ws.buka());
    act(() => ws.terima(init()));
    act(() => ws.terima({ type: "teacher:waiting", graceMs: 120000 }));

    expect(result.current.teacherWaiting).toBe(true);
    expect(result.current.meeting.status).toBe("live");
    expect(result.current.hasTeacher).toBe(true);
  });

  it("teacher:disconnected mengakhiri pertemuan dan membatalkan status menunggu", () => {
    const { result, ws } = pasang();
    act(() => ws.buka());
    act(() => ws.terima(init()));
    act(() => ws.terima({ type: "teacher:waiting" }));
    act(() => ws.terima({ type: "teacher:disconnected" }));

    expect(result.current.teacherWaiting).toBe(false);
    expect(result.current.hasTeacher).toBe(false);
    expect(result.current.meeting.status).toBe("finished");
    expect(result.current.notice).toMatch(/sesi live telah selesai/i);
  });
});

describe("penolakan dari server", () => {
  it("invalid_code membuka pintu kode akses", () => {
    const { ws, onAccessRevoked } = pasang();
    act(() => ws.buka());
    act(() => ws.terima({ type: "error", reason: "invalid_code", message: "Kode tidak valid." }));

    expect(onAccessRevoked).toHaveBeenCalledWith("Kode tidak valid.");
  });

  it("not_enrolled membuka pintu kode akses, bukan memaksa masuk ulang", () => {
    const { ws, onAccessRevoked, onSessionExpired } = pasang();
    act(() => ws.buka());
    act(() => ws.terima({ type: "error", reason: "not_enrolled", message: "Belum bergabung." }));

    expect(onAccessRevoked).toHaveBeenCalledWith("Belum bergabung.");
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  // Tanda sesi mati (logout di perangkat lain, atau akun dihapus dosen) tidak
  // bisa diperbaiki dengan kode akses -- mahasiswa harus masuk lagi.
  it("unauthenticated memaksa masuk ulang, bukan meminta kode akses", () => {
    const { ws, onAccessRevoked, onSessionExpired } = pasang();
    act(() => ws.buka());
    act(() => ws.terima({ type: "error", reason: "unauthenticated", message: "Sesi berakhir." }));

    expect(onSessionExpired).toHaveBeenCalled();
    expect(onAccessRevoked).not.toHaveBeenCalled();
  });

  it("unavailable menampilkan layar penutup, bukan sekadar notis", () => {
    const { result, ws } = pasang();
    act(() => ws.buka());
    act(() => ws.terima({ type: "error", reason: "unavailable", message: "Pertemuan belum tersedia." }));

    expect(result.current.closedMessage).toBe("Pertemuan belum tersedia.");
  });
});

describe("isi file", () => {
  it("file:update menyimpan isi dan menandai perubahan", () => {
    const { result, ws } = pasang();
    act(() => ws.buka());
    act(() => ws.terima(init()));
    act(() =>
      ws.terima({
        type: "file:update",
        path: "lib/b.dart",
        content: "class B {}",
        language: "dart",
        change: "modified",
      }),
    );

    expect(result.current.files["lib/b.dart"]).toMatchObject({ content: "class B {}", language: "dart" });
    expect(result.current.changes["lib/b.dart"]).toBe("modified");
  });

  it("file:delete membuang isi dan melepas pilihan", () => {
    const { result, ws } = pasang();
    act(() => ws.buka());
    act(() => ws.terima(init()));
    act(() => ws.terima({ type: "file:delete", path: "lib/a.dart" }));

    expect(result.current.files["lib/a.dart"]).toBeUndefined();
    expect(result.current.selectedFile).toBeNull();
  });
});
