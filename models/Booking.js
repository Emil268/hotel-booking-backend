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
    totalPrice: {
      // Total harga booking = totalDays x pricePerNight (dihitung otomatis di controller)
      // (dulu bernama "totalPrize" -> lihat utils/migrateTotalPrice.js untuk data lama)
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
    // Waktu terakhir link invoice dikirim via WhatsApp. Dipakai sebagai cooldown agar
    // pengguna yang menekan "download invoice" berkali-kali tidak memicu spam WA.
    invoiceNotifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index untuk query cek bentrok jadwal (roomId + status + rentang tanggal)
bookingSchema.index({ roomId: 1, status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
