const WebSocket = require("ws");

const sessionId = "abc123";
const ws = new WebSocket("ws://localhost:3000");
const { TEACHER_TOKEN } = process.env;

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "student:join",
      sessionId,
    }),
  );

  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: "file:request",
        sessionId,
        path: "routes/web.php",
      }),
    );
  }, 1000);
});

ws.on("message", (data) => {
  console.log("[student]", data.toString());
});
