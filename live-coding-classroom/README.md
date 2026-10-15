# Live Coding Classroom VS Code Extension

Custom VS Code extension untuk dosen. Extension ini membaca workspace VS Code, mengirim struktur folder, perubahan file, dan file aktif ke backend Node.js + WebSocket. Mahasiswa melihat hasilnya melalui web frontend secara view-only.

## Fitur

- Start live coding session dari Command Palette.
- Stop live coding session.
- Copy student link.
- Kirim initial project file tree.
- Watch file create, update, dan delete.
- Kirim active file saat dosen berpindah tab editor.
- Abaikan file/folder sensitif dan berat secara default.
- Batasi ukuran file yang dikirim.

## Commands

- `Live Coding: Start Session`
- `Live Coding: Stop Session`
- `Live Coding: Copy Student Link`

## Settings

- `liveCoding.backendUrl`: URL backend WebSocket, contoh `ws://localhost:3000`.
- `liveCoding.studentBaseUrl`: base URL web mahasiswa, contoh `http://localhost:5173/session`.
- `liveCoding.teacherToken`: token dosen untuk backend.
- `liveCoding.exclude`: daftar file/folder yang tidak dikirim.
- `liveCoding.maxFileSizeKb`: batas ukuran file teks yang dikirim.

## Cara Menjalankan Saat Development

```bash
npm install
npm run compile
```

Lalu buka project ini di VS Code dan tekan `F5`. VS Code akan membuka Extension Development Host.

Di Extension Development Host:

1. Buka project Laravel atau project lain.
2. Jalankan command `Live Coding: Start Session`.
3. Isi session ID.
4. Extension akan connect ke backend WebSocket.

## Cara Package ke VSIX

```bash
npm install
npm run compile
npx vsce package
```

File `.vsix` hasil package bisa diinstall ke VS Code.

## Event yang Dikirim ke Backend

### Teacher Join

```json
{
  "type": "teacher:join",
  "sessionId": "session-abc123",
  "projectName": "laravel-demo",
  "teacherToken": "dev-secret-token"
}
```

### Project Snapshot

```json
{
  "type": "project:snapshot",
  "sessionId": "session-abc123",
  "tree": []
}
```

### File Update

```json
{
  "type": "file:update",
  "sessionId": "session-abc123",
  "path": "routes/web.php",
  "content": "<?php ...",
  "language": "php",
  "updatedAt": "2026-05-05T10:15:00.000Z"
}
```

### Active File

```json
{
  "type": "teacher:active-file",
  "sessionId": "session-abc123",
  "path": "app/Http/Controllers/UserController.php"
}
```

## Catatan Keamanan

Secara default extension mengabaikan `.env`, `.git`, `node_modules`, `vendor`, file log, database lokal, media, archive, dan PDF. Untuk produksi, backend tetap harus validasi role teacher, token, session ID, dan path file.
