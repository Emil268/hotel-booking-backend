const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const DB_STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check aplikasi & koneksi database
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200: { description: Aplikasi dan database sehat }
 *       503: { description: Database tidak terhubung / tidak merespons }
 */
router.get('/', async (req, res) => {
  const readyState = mongoose.connection.readyState;
  const database = { status: DB_STATES[readyState] || 'unknown' };

  // Jika terhubung, pastikan database benar-benar merespons (bukan sekadar status koneksi)
  if (readyState === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      database.ping = 'ok';
    } catch (err) {
      database.status = 'error';
    }
  }

  const healthy = database.status === 'connected';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database,
  });
});

module.exports = router;
