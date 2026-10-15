const express = require("express");
const http = require("http");
const cors = require("cors");
const WebSocket = require("ws");
const { nanoid } = require("nanoid");

const { config } = require("./config");
const {
  getSession,
  listSessions,
  touchSession,
  removeStudent,
  cleanupSessionIfEmpty,
} = require("./sessions");
const { isSafeRelativePath, isValidMessage } = require("./validation");
const { send, broadcastToStudents, parseMessage } = require("./wsUtils");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "live-coding-backend" });
});

app.get("/api/sessions", (_req, res) => {
  res.json({ sessions: listSessions() });
});

app.post("/api/sessions", (_req, res) => {
  const sessionId = nanoid(10);
  const session = getSession(sessionId);
  res.status(201).json({
    sessionId,
    studentUrl: `${config.publicBaseUrl}/session/${sessionId}`,
    createdAt: session.createdAt,
  });
});

function requireTeacher(ws, session) {
  if (ws.role !== "teacher" || session.teacher !== ws) {
    send(ws, {
      type: "error",
      message: "Only the teacher connection can send this event.",
    });
    return false;
  }
  return true;
}

function handleTeacherJoin(ws, message, session) {
  if (message.teacherToken !== config.teacherToken) {
    send(ws, {
      type: "error",
      message: "Invalid teacher token.",
    });
    ws.close(1008, "Invalid teacher token");
    return;
  }

  if (session.teacher && session.teacher !== ws) {
    send(ws, {
      type: "error",
      message: "A teacher is already connected to this session.",
    });
    ws.close(1008, "Teacher already connected");
    return;
  }

  session.teacher = ws;
  session.projectName = message.projectName || session.projectName;
  touchSession(session);

  ws.role = "teacher";
  ws.sessionId = message.sessionId;

  send(ws, {
    type: "teacher:joined",
    sessionId: message.sessionId,
    studentUrl: `${config.publicBaseUrl}/session/${message.sessionId}`,
  });

  broadcastToStudents(session, {
    type: "teacher:connected",
    projectName: session.projectName,
  });
}

function handleStudentJoin(ws, message, session) {
  session.students.add(ws);
  touchSession(session);

  ws.role = "student";
  ws.sessionId = message.sessionId;

  send(ws, {
    type: "session:init",
    sessionId: message.sessionId,
    projectName: session.projectName,
    tree: session.tree,
    activeFile: session.activeFile,
    hasTeacher: Boolean(session.teacher),
  });
}

function handleProjectSnapshot(ws, message, session) {
  if (!requireTeacher(ws, session)) return;

  session.tree = Array.isArray(message.tree) ? message.tree : [];
  touchSession(session);

  broadcastToStudents(session, {
    type: "tree:update",
    tree: session.tree,
  });
}

function handleTreeUpdate(ws, message, session) {
  if (!requireTeacher(ws, session)) return;

  session.tree = Array.isArray(message.tree) ? message.tree : [];
  touchSession(session);

  broadcastToStudents(session, {
    type: "tree:update",
    tree: session.tree,
  });
}

function handleFileUpsert(ws, message, session) {
  if (!requireTeacher(ws, session)) return;

  if (!isSafeRelativePath(message.path)) {
    send(ws, { type: "error", message: "Unsafe file path rejected." });
    return;
  }

  if (typeof message.content !== "string") {
    send(ws, { type: "error", message: "File content must be a string." });
    return;
  }

  const contentBytes = Buffer.byteLength(message.content, "utf8");
  if (contentBytes > config.maxFileSizeBytes) {
    send(ws, {
      type: "error",
      message: `File too large. Max size is ${config.maxFileSizeBytes} bytes.`,
      path: message.path,
    });
    return;
  }

  const updatedAt = message.updatedAt || new Date().toISOString();

  session.files.set(message.path, {
    content: message.content,
    language: message.language || "plaintext",
    updatedAt,
  });
  touchSession(session);

  broadcastToStudents(session, {
    type: message.type,
    path: message.path,
    content: message.content,
    language: message.language || "plaintext",
    updatedAt,
  });
}

function handleFileDelete(ws, message, session) {
  if (!requireTeacher(ws, session)) return;

  if (!isSafeRelativePath(message.path)) {
    send(ws, { type: "error", message: "Unsafe file path rejected." });
    return;
  }

  session.files.delete(message.path);
  touchSession(session);

  broadcastToStudents(session, {
    type: "file:delete",
    path: message.path,
  });
}

function handleActiveFile(ws, message, session) {
  if (!requireTeacher(ws, session)) return;

  if (!isSafeRelativePath(message.path)) {
    send(ws, { type: "error", message: "Unsafe file path rejected." });
    return;
  }

  session.activeFile = message.path;
  touchSession(session);

  broadcastToStudents(session, {
    type: "teacher:active-file",
    path: message.path,
  });
}

function handleFileRequest(ws, message, session) {
  if (ws.role !== "student") {
    send(ws, {
      type: "error",
      message: "Only students can request file content.",
    });
    return;
  }

  if (!isSafeRelativePath(message.path)) {
    send(ws, { type: "error", message: "Unsafe file path rejected." });
    return;
  }

  const file = session.files.get(message.path);
  if (!file) {
    send(ws, {
      type: "file:not-found",
      path: message.path,
    });
    return;
  }

  send(ws, {
    type: "file:content",
    path: message.path,
    content: file.content,
    language: file.language,
    updatedAt: file.updatedAt,
  });
}

wss.on("connection", (ws) => {
  send(ws, {
    type: "connected",
    message: "Connected to Live Coding backend.",
  });

  ws.on("message", (raw) => {
    const message = parseMessage(raw);

    if (!isValidMessage(message)) {
      send(ws, {
        type: "error",
        message: "Invalid JSON message.",
      });
      return;
    }

    const { type, sessionId } = message;
    if (!sessionId || typeof sessionId !== "string") {
      send(ws, {
        type: "error",
        message: "sessionId is required.",
      });
      return;
    }

    const session = getSession(sessionId);

    switch (type) {
      case "teacher:join":
        handleTeacherJoin(ws, message, session);
        break;

      case "student:join":
        handleStudentJoin(ws, message, session);
        break;

      case "project:snapshot":
        handleProjectSnapshot(ws, message, session);
        break;

      case "tree:update":
        handleTreeUpdate(ws, message, session);
        break;

      case "file:update":
      case "file:create": {
        if (ws.role !== "teacher") return;

        session.files.set(message.path, {
          type: "text",
          content: message.content,
          language: message.language,
          updatedAt: message.updatedAt || new Date().toISOString(),
        });

        broadcastToStudents(session, {
          type,
          path: message.path,
          content: message.content,
          language: message.language,
          updatedAt: message.updatedAt,
        });

        break;
      }
      case "file:delete":
        handleFileDelete(ws, message, session);
        break;

      case "teacher:active-file":
        handleActiveFile(ws, message, session);
        break;
      case "file:request": {
        const file = session.files.get(message.path);

        if (!file) {
          send(ws, {
            type: "file:not-found",
            path: message.path,
          });
          return;
        }

        if (file.type === "asset") {
          send(ws, {
            type: "asset:content",
            path: message.path,
            assetType: file.assetType || "binary",
            updatedAt: file.updatedAt,
          });

          return;
        }

        send(ws, {
          type: "file:content",
          path: message.path,
          content: file.content,
          language: file.language,
          updatedAt: file.updatedAt,
        });

        break;
      }
      case "asset:metadata": {
        if (ws.role !== "teacher") return;

        session.files.set(message.path, {
          type: "asset",
          assetType: message.assetType || "binary",
          updatedAt: message.updatedAt || new Date().toISOString(),
        });

        broadcastToStudents(session, {
          type: "asset:metadata",
          path: message.path,
          assetType: message.assetType || "binary",
          updatedAt: message.updatedAt,
        });

        break;
      }

      default:
        send(ws, {
          type: "error",
          message: `Unknown event type: ${type}`,
        });
    }
  });

  ws.on("close", () => {
    if (!ws.sessionId) return;

    const session = getSession(ws.sessionId);

    if (ws.role === "teacher" && session.teacher === ws) {
      session.teacher = null;
      broadcastToStudents(session, {
        type: "teacher:disconnected",
      });
    }

    if (ws.role === "student") {
      removeStudent(session, ws);
    }

    cleanupSessionIfEmpty(ws.sessionId);
  });
});

server.listen(config.port, () => {
  console.log(`Live Coding backend running on http://localhost:${config.port}`);
});
