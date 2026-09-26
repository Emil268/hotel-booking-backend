const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel', // relasi ke koleksi Hotels
      required: [true, 'Kamar harus terhubung dengan hotel'],
    },
    roomType: {
      type: String,
      required: [true, 'Tipe kamar wajib diisi'],
      trim: true,
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Harga per malam wajib diisi'],
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true, // status ketersediaan kamar untuk dipesan
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Room', roomSchema);
