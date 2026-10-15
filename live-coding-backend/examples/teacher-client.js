const WebSocket = require("ws");

const sessionId = "abc123";
const ws = new WebSocket("ws://localhost:3000");
const teacherToken = process.env.TEACH;
ER_TOKEN || "change-this-secret-token";
ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "teacher:join",
      sessionId,
      projectName: "Laravel Demo",
      teacherToken: process.env.TEACHER_TOKEN || "change-this-secret-token",
    }),
  );

  ws.send(
    JSON.stringify({
      type: "project:snapshot",
      sessionId,
      tree: [
        {
          name: "routes",
          path: "routes",
          type: "folder",
          children: [{ name: "web.php", path: "routes/web.php", type: "file" }],
        },
      ],
    }),
  );

  setInterval(() => {
    ws.send(
      JSON.stringify({
        type: "file:update",
        sessionId,
        path: "routes/web.php",
        content: `<?php\n\n// Updated at ${new Date().toISOString()}\nRoute::get('/', fn () => view('welcome'));\n`,
        language: "php",
        updatedAt: new Date().toISOString(),
      }),
    );
  }, 3000);
});

ws.on("message", (data) => {
  console.log("[teacher]", data.toString());
});
