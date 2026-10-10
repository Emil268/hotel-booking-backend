/**
 * addrooms.js
 * Menambah 1 hotel + 1 kamar contoh dan mencetak ID kamarnya (berguna untuk mencoba
 * POST /api/bookings). Jalankan: npm run add-room
 *
 * - Hanya memakai field yang ADA di schema Hotel & Room (name, location, description, rating /
 *   hotelId, roomType, pricePerNight, isAvailable). Field lain akan diabaikan Mongoose.
 * - Idempoten: dijalankan berkali-kali TIDAK membuat hotel/kamar duplikat
 *   (dicari dulu berdasarkan nama hotel & tipe kamar, baru dibuat jika belum ada).
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Hotel = require('./models/Hotel');
const Room = require('./models/Room');

const HOTEL = {
  name: 'Hotel Grand Indonesia',
  location: 'Jakarta',
  description: 'Hotel contoh di pusat kota Jakarta.',
  rating: 4.5,
};
const ROOM = { roomType: 'Deluxe', pricePerNight: 350000, isAvailable: true };

const addRoom = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // upsert: buat hanya jika belum ada (setOnInsert), kalau sudah ada pakai yang lama
    const hotel = await Hotel.findOneAndUpdate(
      { name: HOTEL.name, location: HOTEL.location },
      { $setOnInsert: HOTEL },
      { upsert: true, new: true }
    );

    const room = await Room.findOneAndUpdate(
      { hotelId: hotel._id, roomType: ROOM.roomType },
      { $setOnInsert: { ...ROOM, hotelId: hotel._id } },
      { upsert: true, new: true }
    );

    console.log('====================================');
    console.log(`Hotel : ${hotel.name} (${hotel._id})`);
    console.log(`Kamar : ${room.roomType} - ID: ${room._id}`);
    console.log('====================================');
  } catch (error) {
    console.error('Gagal:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

addRoom();
