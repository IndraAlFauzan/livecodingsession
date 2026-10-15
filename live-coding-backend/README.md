# Live Coding Classroom Backend

Backend Node.js + WebSocket untuk menerima perubahan file dari VS Code Extension dosen dan membroadcast perubahan tersebut ke web mahasiswa.

## Fitur

- WebSocket server untuk dosen dan mahasiswa.
- Session berbasis `sessionId`.
- Role `teacher` dan `student`.
- Teacher token untuk mencegah mahasiswa mengirim update file.
- Broadcast real-time:
  - `project:snapshot`
  - `tree:update`
  - `file:create`
  - `file:update`
  - `file:delete`
  - `teacher:active-file`
- REST endpoint sederhana untuk health check dan membuat session.
- Validasi path untuk mencegah path traversal.
- Limit ukuran file.

## Instalasi

```bash
npm install
cp .env.example .env
npm run dev
```

Server berjalan di:

```text
http://localhost:3000
ws://localhost:3000
```

## Environment

```env
PORT=3000
TEACHER_TOKEN=change-this-secret-token
PUBLIC_BASE_URL=http://localhost:5173
MAX_FILE_SIZE_BYTES=524288
```

Pastikan `TEACHER_TOKEN` sama dengan token yang digunakan oleh VS Code Extension.

## Endpoint REST

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "live-coding-backend"
}
```

### Buat Session

```http
POST /api/sessions
```

Response:

```json
{
  "sessionId": "abc123",
  "studentUrl": "http://localhost:5173/session/abc123",
  "createdAt": "2026-05-05T00:00:00.000Z"
}
```

### Lihat Session Aktif

```http
GET /api/sessions
```

## Event WebSocket

### Teacher Join

```json
{
  "type": "teacher:join",
  "sessionId": "abc123",
  "projectName": "Laravel Demo",
  "teacherToken": "change-this-secret-token"
}
```

### Student Join

```json
{
  "type": "student:join",
  "sessionId": "abc123"
}
```

### Project Snapshot

```json
{
  "type": "project:snapshot",
  "sessionId": "abc123",
  "tree": []
}
```

### File Update

```json
{
  "type": "file:update",
  "sessionId": "abc123",
  "path": "routes/web.php",
  "content": "<?php echo 'hello';",
  "language": "php"
}
```

### Request File dari Mahasiswa

```json
{
  "type": "file:request",
  "sessionId": "abc123",
  "path": "routes/web.php"
}
```

## Cara Tes Cepat

Terminal 1:

```bash
npm run dev
```

Terminal 2, jalankan client teacher dummy:

```bash
node examples/teacher-client.js
```

Terminal 3, jalankan client student dummy:

```bash
node examples/student-client.js
```
