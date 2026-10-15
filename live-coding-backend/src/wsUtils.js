const WebSocket = require('ws');

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcast(clients, payload) {
  for (const client of clients) {
    send(client, payload);
  }
}

function broadcastToStudents(session, payload) {
  broadcast(session.students, payload);
}

function parseMessage(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
}

module.exports = {
  send,
  broadcast,
  broadcastToStudents,
  parseMessage,
};
