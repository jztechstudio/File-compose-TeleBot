const express = require('express');
const path = require('path');

function createServer() {
  const app = express();

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  return app;
}

module.exports = createServer;
