/**
 * server.js
 * Entry point: baca .env, validasi konfigurasi, sambung database, lalu nyalakan server.
 * Perakitan aplikasi Express ada di app.js.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const { validateEnv } = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

// Fail-fast: jangan menyalakan server dengan konfigurasi tidak aman / tidak lengkap
const { errors, warnings } = validateEnv();
warnings.forEach((w) => logger.warn(`Konfigurasi: ${w}`));
if (errors.length) {
  errors.forEach((e) => logger.error(`Konfigurasi tidak valid: ${e}`));
  process.exit(1);
}

const app = require('./app');
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB(); // keluar dengan exit code 1 jika database tidak bisa diakses

  const server = app.listen(PORT, () => {
    logger.info(`Server berjalan di http://localhost:${PORT}`);
    logger.info(`Swagger docs tersedia di http://localhost:${PORT}/api-docs`);
  });

  // Graceful shutdown: selesaikan request yang sedang berjalan, lalu tutup koneksi DB
  const shutdown = (signal) => {
    logger.info(`Menerima ${signal}, mematikan server...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref(); // paksa keluar jika terlalu lama
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start();
