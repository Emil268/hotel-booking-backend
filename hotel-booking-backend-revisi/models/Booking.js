const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // relasi ke koleksi Users
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room', // relasi ke koleksi Rooms
      required: true,
    },
    bookingId: {
      type: String,
      required: true,
      unique: true, // ID booking unik yang di-generate otomatis (lihat utils/generateBookingId.js)
    },
    startDate: {
      type: Date,
      required: [true, 'Tanggal check-in wajib diisi'],
    },
    endDate: {
      type: Date,
      required: [true, 'Tanggal check-out wajib diisi'],
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrize: {
      // Total harga booking = totalDays x pricePerNight (dihitung otomatis di controller)
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Pending', 'Dikonfirmasi', 'Ditolak', 'Cancelled'],
      default: 'Pending',
    },
    // Menyimpan nama file invoice PDF yang sudah pernah digenerate (jika ada),
    // agar tidak perlu generate ulang setiap kali user mengunduh invoice yang sama.
    invoiceFile: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
