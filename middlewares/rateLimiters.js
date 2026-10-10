const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

/**
 * Rate limiting. Batas bisa diatur lewat .env (lihat .env.example):
 *  - AUTH_RATE_LIMIT_MAX  : maks. percobaan login/registrasi per IP per jendela (default 20)
 *  - API_RATE_LIMIT_MAX   : maks. request API umum per IP per jendela (default 300)
 *  - RATE_LIMIT_WINDOW_MIN: lebar jendela dalam menit (default 15)
 * Dibuat lewat factory agar nilai env dibaca saat aplikasi dibuat (memudahkan pengujian).
 */
const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

const build = (limit, message) =>
  rateLimit({
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MIN, 15) * 60 * 1000,
    limit,
    standardHeaders: 'draft-7', // header RateLimit-* standar
    legacyHeaders: false,
    // Diteruskan ke errorHandler supaya format error tetap konsisten ({success,statusCode,message})
    handler: (req, res, next) => next(new ApiError(429, message)),
  });

const createLimiters = () => ({
  apiLimiter: build(toInt(process.env.API_RATE_LIMIT_MAX, 300), 'Terlalu banyak request, coba lagi beberapa saat lagi'),
  authLimiter: build(
    toInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
    'Terlalu banyak percobaan login/registrasi, coba lagi beberapa menit lagi'
  ),
});

module.exports = { createLimiters };
