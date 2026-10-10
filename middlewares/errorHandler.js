const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

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
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Terjadi kesalahan pada server';

  // Body JSON rusak / terlalu besar (dari express.json)
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Format JSON pada request body tidak valid';
  }
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Ukuran request body terlalu besar';
  }

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

  // Logging terstruktur: stack trace hanya dicatat untuk error server (5xx)
  const logContext = { method: req.method, path: req.originalUrl.split('?')[0].replace(/(\/api\/invoices\/)[^/]+/, '$1[REDACTED]'), statusCode, message };
  if (statusCode >= 500) {
    logger.error('Unhandled server error', { ...logContext, stack: err.stack });
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
