import { describe, it, expect } from "vitest";
import { derivedStatus, isRunning } from "./meetingStatus.js";

const pertemuan = (ubahan) => ({
  status: "draft",
  teacherConnected: false,
  reconnecting: false,
  ...ubahan,
});

describe("derivedStatus", () => {
  it("meneruskan status apa adanya untuk draft dan finished", () => {
    expect(derivedStatus(pertemuan({ status: "draft" }))).toBe("draft");
    expect(derivedStatus(pertemuan({ status: "finished" }))).toBe("finished");
  });

  it("live dengan dosen terhubung tetap live", () => {
    expect(derivedStatus(pertemuan({ status: "live", teacherConnected: true }))).toBe("live");
  });

  it("live tanpa dosen dianggap selesai", () => {
    expect(derivedStatus(pertemuan({ status: "live" }))).toBe("finished");
  });

  // Ini bug nyata: MeetingTable dulu punya salinan logika yang mengabaikan
  // reconnecting, sehingga selama masa tenggang tabel menampilkan "Selesai"
  // padahal kartu di atasnya "Live".
  it("live selama masa tenggang tetap live walau dosen belum tersambung lagi", () => {
    expect(derivedStatus(pertemuan({ status: "live", reconnecting: true }))).toBe("live");
  });

  it("tidak peduli reconnecting kalau pertemuannya memang sudah selesai", () => {
    expect(derivedStatus(pertemuan({ status: "finished", reconnecting: true }))).toBe("finished");
  });
});

describe("isRunning", () => {
  it("benar hanya saat pertemuan live dan ada dosen atau sedang ditunggu", () => {
    expect(isRunning(pertemuan({ status: "live", teacherConnected: true }))).toBe(true);
    expect(isRunning(pertemuan({ status: "live", reconnecting: true }))).toBe(true);
    expect(isRunning(pertemuan({ status: "live" }))).toBe(false);
    expect(isRunning(pertemuan({ status: "draft", teacherConnected: true }))).toBe(false);
  });
});
