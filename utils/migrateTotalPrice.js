/**
 * utils/migrateTotalPrice.js
 * Migrasi satu kali: mengganti nama field lama "totalPrize" menjadi "totalPrice"
 * pada booking yang sudah ada di database. Aman dijalankan berulang (idempoten).
 * Jalankan: npm run migrate:price
 */
require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await mongoose.connection
      .collection('bookings')
      .updateMany({ totalPrize: { $exists: true }, totalPrice: { $exists: false } }, { $rename: { totalPrize: 'totalPrice' } });
    console.log(`Selesai. Booking yang dimigrasi: ${result.modifiedCount}`);
  } catch (error) {
    console.error('Migrasi gagal:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
