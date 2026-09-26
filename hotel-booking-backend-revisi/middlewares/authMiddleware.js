const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * protect
 * Middleware untuk memverifikasi token JWT yang dikirim di header:
 *   Authorization: Bearer <token>
 * Jika valid, data user (tanpa password) akan disimpan di req.user
 * agar bisa dipakai oleh controller/middleware selanjutnya.
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Akses ditolak. Token tidak ditemukan, silakan login terlebih dahulu');
    }

    // Verifikasi & decode token. Jika token expired/invalid, jwt.verify akan throw error
    // yang kemudian ditangkap oleh catch block dan diteruskan ke errorHandler global.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ambil data user terbaru dari database (memastikan user masih ada / belum dihapus)
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError(401, 'Token tidak valid, user tidak ditemukan');
    }

    req.user = user; // attach user ke request object
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * adminOnly
 * Middleware RBAC: hanya boleh dilanjutkan jika req.user.role === 'Admin'.
 * Middleware ini WAJIB dipasang setelah `protect` karena bergantung pada req.user.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    return next();
  }
  next(new ApiError(403, 'Akses ditolak. Hanya Admin yang dapat mengakses resource ini'));
};

module.exports = { protect, adminOnly };
