const http = require('http');

const { config } = require('./config');
const { createApp } = require('./httpApp');
const { attachRealtime } = require('./realtime');

const server = http.createServer(createApp());
attachRealtime(server);

server.listen(config.port, () => {
  console.log(`Live Coding backend running on http://localhost:${config.port}`);
  console.log(`Database: ${config.dbPath}`);
});
