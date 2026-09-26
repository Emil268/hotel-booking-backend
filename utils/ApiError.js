/**
 * ApiError
 * Custom Error class agar setiap error yang dilempar dari controller
 * membawa informasi statusCode HTTP yang jelas, lalu ditangani secara
 * terpusat oleh middlewares/errorHandler.js
 *
 * Contoh pemakaian di controller:
 *   throw new ApiError(404, 'Kamar tidak ditemukan');
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // menandakan ini error yang "diharapkan" (bukan bug)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
