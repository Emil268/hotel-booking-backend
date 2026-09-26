const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nama wajib diisi'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email wajib diisi'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Format email tidak valid'],
    },
    password: {
      type: String,
      required: [true, 'Password wajib diisi'],
      minlength: 6,
      select: false, // password tidak akan ikut ter-return secara default saat query
    },
    // Nomor WhatsApp dibutuhkan sebagai tujuan pengiriman notifikasi via Fonnte.
    // Field ini adalah tambahan wajar di luar spesifikasi eksplisit, karena
    // notifikasi WA tidak bisa dikirim tanpa nomor tujuan.
    phoneNumber: {
      type: String,
      required: [true, 'Nomor WhatsApp wajib diisi untuk notifikasi booking'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['User', 'Admin'],
      default: 'User',
    },
  },
  {
    timestamps: true, // otomatis menambahkan createdAt & updatedAt
  }
);

/**
 * Hook pre-save: hash password secara otomatis sebelum disimpan ke database,
 * hanya dijalankan jika field password berubah (baru dibuat / diupdate).
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Method instance untuk membandingkan password plaintext (login)
 * dengan password hash yang tersimpan di database.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
