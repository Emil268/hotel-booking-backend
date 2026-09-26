const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../utils/paginate');

/**
 * @desc    Admin melihat semua user
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: buildPaginationMeta(total, page, limit),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin melihat detail satu user
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin)
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User tidak ditemukan');
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin membuat user baru (termasuk bisa membuat Admin baru)
 * @route   POST /api/admin/users
 * @access  Private (Admin)
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber, role } = req.body;

    if (!name || !email || !password || !phoneNumber) {
      throw new ApiError(400, 'Nama, email, password, dan nomor WhatsApp wajib diisi');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) throw new ApiError(400, 'Email sudah terdaftar');

    const user = await User.create({ name, email, password, phoneNumber, role });

    res.status(201).json({ success: true, message: 'User berhasil dibuat', data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin mengupdate data user (nama, email, role, dsb)
 * @route   PUT /api/admin/users/:id
 * @access  Private (Admin)
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User tidak ditemukan');

    // Password tidak diupdate lewat endpoint ini demi keamanan (butuh flow khusus reset password)
    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (role) user.role = role;

    await user.save();

    res.status(200).json({ success: true, message: 'User berhasil diperbarui', data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin menghapus user
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User tidak ditemukan');

    await user.deleteOne();

    res.status(200).json({ success: true, message: 'User berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
