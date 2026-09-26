const ApiError = require('../utils/ApiError');

/**
 * notFound
 * Menangani request ke endpoint yang tidak terdaftar sama sekali (404).
 * Dipasang PALING BAWAH, setelah semua route terdaftar.
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Endpoint tidak ditemukan: ${req.originalUrl}`);
  next(error);
};

/**
 * errorHandler
 * Global Error Handling Middleware (WAJIB memiliki 4 parameter agar dikenali
 * Express sebagai error-handling middleware).
 * Menangkap SEMUA error yang dilempar (throw) atau diteruskan lewat next(error)
 * dari mana pun di aplikasi (controller, middleware, database, dll),
 * lalu mengembalikan response JSON yang rapi & konsisten.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Terjadi kesalahan pada server';

  // Error karena format ObjectId MongoDB tidak valid (misal id salah ketik)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Format ID tidak valid: ${err.value}`;
  }

  // Error validasi schema Mongoose (field required, minlength, dll)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Error duplicate key MongoDB (misal email sudah terdaftar)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Data dengan ${field} tersebut sudah terdaftar`;
  }

  // Error token JWT tidak valid / rusak
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token tidak valid';
  }

  // Error token JWT sudah kedaluwarsa
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Sesi login telah berakhir, silakan login kembali';
  }

  console.error(`[ERROR] ${req.method} ${req.originalUrl} -> ${message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    // stack trace hanya ditampilkan saat development, demi keamanan production
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
