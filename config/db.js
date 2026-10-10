const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * connectDB
 * Menghubungkan aplikasi ke MongoDB menggunakan Mongoose.
 * Jika koneksi gagal, proses Node.js akan dihentikan (exit code 1)
 * karena aplikasi tidak dapat berjalan tanpa database.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    logger.info('MongoDB terhubung', { host: conn.connection.host, database: conn.connection.name });
  } catch (error) {
    logger.error('Gagal terhubung ke MongoDB', { error: error.message });
    // Hentikan aplikasi jika database tidak bisa diakses,
    // karena seluruh endpoint bergantung pada database.
    process.exit(1);
  }
};

module.exports = connectDB;
