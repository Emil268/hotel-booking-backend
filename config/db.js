const mongoose = require('mongoose');

/**
 * connectDB
 * Menghubungkan aplikasi ke MongoDB menggunakan Mongoose.
 * Jika koneksi gagal, proses Node.js akan dihentikan (exit code 1)
 * karena aplikasi tidak dapat berjalan tanpa database.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Gagal terhubung ke MongoDB: ${error.message}`);
    // Hentikan aplikasi jika database tidak bisa diakses,
    // karena seluruh endpoint bergantung pada database.
    process.exit(1);
  }
};

module.exports = connectDB;
