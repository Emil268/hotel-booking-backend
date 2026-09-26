/**
 * utils/seed.js
 * Script untuk mengisi database dengan data dummy (development/testing).
 * Jalankan dengan: node utils/seed.js  (atau: npm run seed)
 *
 * Data yang akan dibuat:
 * - 2 User (1 Admin, 1 User biasa)
 * - 2 Hotel
 * - Beberapa Room (tersebar di kedua hotel)
 *
 * PERHATIAN: Script ini akan MENGHAPUS seluruh data lama di koleksi
 * Users, Hotels, dan Rooms sebelum menginput data baru (untuk mencegah duplikasi).
 */

require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');

const seedData = async () => {
  try {
    await connectDB();

    console.log('🗑️  Menghapus data lama (Users, Hotels, Rooms)...');
    await User.deleteMany();
    await Hotel.deleteMany();
    await Room.deleteMany();

    // ===== SEED USERS =====
    // Password akan otomatis di-hash oleh pre-save hook di model User,
    // sehingga di sini cukup ditulis plain text.
    console.log('👤 Membuat data User...');
    const admin = await User.create({
      name: 'Admin Utama',
      email: 'admin@hotelbooking.com',
      password: 'admin123',
      phoneNumber: '628111234567',
      role: 'Admin',
    });

    const user = await User.create({
      name: 'Budi Santoso',
      email: 'budi@example.com',
      password: 'user123',
      phoneNumber: '628119876543',
      role: 'User',
    });

    // ===== SEED HOTELS =====
    console.log('🏨 Membuat data Hotel...');
    const hotel1 = await Hotel.create({
      name: 'Grand Paradise Hotel',
      location: 'Bali, Indonesia',
      description: 'Hotel bintang 5 dengan pemandangan langsung ke pantai.',
      rating: 4.8,
    });

    const hotel2 = await Hotel.create({
      name: 'Cozy Stay Inn',
      location: 'Bandung, Indonesia',
      description: 'Hotel nyaman dengan harga terjangkau di pusat kota.',
      rating: 4.2,
    });

    // ===== SEED ROOMS =====
    console.log('🛏️  Membuat data Room...');
    await Room.create([
      {
        hotelId: hotel1._id,
        roomType: 'Deluxe Ocean View',
        pricePerNight: 1500000,
        isAvailable: true,
      },
      {
        hotelId: hotel1._id,
        roomType: 'Superior Room',
        pricePerNight: 900000,
        isAvailable: true,
      },
      {
        hotelId: hotel1._id,
        roomType: 'Presidential Suite',
        pricePerNight: 5000000,
        isAvailable: true,
      },
      {
        hotelId: hotel2._id,
        roomType: 'Standard Room',
        pricePerNight: 350000,
        isAvailable: true,
      },
      {
        hotelId: hotel2._id,
        roomType: 'Family Room',
        pricePerNight: 600000,
        isAvailable: true,
      },
    ]);

    console.log('\n✅ Seeding data berhasil!');
    console.log('----------------------------------------');
    console.log('Akun Admin -> email: admin@hotelbooking.com | password: admin123');
    console.log('Akun User  -> email: budi@example.com       | password: user123');
    console.log('----------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding gagal: ${error.message}`);
    process.exit(1);
  }
};

seedData();
