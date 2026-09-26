const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nama hotel wajib diisi'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Lokasi hotel wajib diisi'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Hotel', hotelSchema);
