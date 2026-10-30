const express = require('express');
const cors = require('cors');

const routes = require('./routes');

// Lapisan HTTP: health check, rute admin dan mahasiswa, penangkap error terakhir.
function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'live-coding-backend' });
  });

  app.use('/api/admin', routes.admin);
  app.use('/api/student', routes.student);

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan di server.' });
  });

  return app;
}

module.exports = { createApp };
