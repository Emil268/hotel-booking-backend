const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Helper untuk generate JWT token berdasarkan id & role user.
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * @desc    Registrasi user baru
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    // Catatan keamanan: `role` SENGAJA tidak diambil dari req.body.
    // Registrasi publik selalu dipaksa menjadi 'User'; pembuatan akun Admin
    // hanya boleh lewat POST /api/admin/users (protected + adminOnly) atau seeding.
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !email || !password || !phoneNumber) {
      throw new ApiError(400, 'Nama, email, password, dan nomor WhatsApp wajib diisi');
    }

    // Validasi panjang password minimal 8 karakter
    if (password.length < 8) {
      throw new ApiError(400, 'Password minimal harus 8 karakter');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'Email sudah terdaftar, silakan gunakan email lain');
    }

    const user = await User.create({
      name,
      email,
      password, // otomatis di-hash oleh pre-save hook di model
      phoneNumber,
      role: 'User', // dipaksa, tidak bisa dioverride dari body request
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user, mengembalikan token JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Email dan password wajib diisi');
    }

    // .select('+password') karena field password di-set select:false di schema
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      throw new ApiError(401, 'Email atau password salah');
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };