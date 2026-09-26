const Room = require('../models/Room');
const Hotel = require('../models/Hotel');
const ApiError = require('../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../utils/paginate');

// Whitelist field yang boleh diubah lewat PUT /api/admin/rooms/:id (anti mass assignment)
const UPDATABLE_ROOM_FIELDS = ['hotelId', 'roomType', 'pricePerNight', 'isAvailable'];

/**
 * @desc    Admin melihat semua kamar (termasuk yang tidak tersedia)
 * @route   GET /api/admin/rooms
 * @access  Private (Admin)
 */
const getAllRooms = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [rooms, total] = await Promise.all([
      Room.find()
        .populate('hotelId', 'name location')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Room.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      count: rooms.length,
      pagination: buildPaginationMeta(total, page, limit),
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin melihat detail satu kamar
 * @route   GET /api/admin/rooms/:id
 * @access  Private (Admin)
 */
const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).populate('hotelId', 'name location');
    if (!room) throw new ApiError(404, 'Kamar tidak ditemukan');
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin menambahkan kamar baru
 * @route   POST /api/admin/rooms
 * @access  Private (Admin)
 */
const createRoom = async (req, res, next) => {
  try {
    const { hotelId, roomType, pricePerNight, isAvailable } = req.body;

    if (!hotelId || !roomType || pricePerNight === undefined) {
      throw new ApiError(400, 'hotelId, roomType, dan pricePerNight wajib diisi');
    }

    // Pastikan hotelId yang direferensikan benar-benar ada
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) throw new ApiError(404, 'Hotel dengan ID tersebut tidak ditemukan');

    const room = await Room.create({ hotelId, roomType, pricePerNight, isAvailable });
    res.status(201).json({ success: true, message: 'Kamar berhasil dibuat', data: room });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin mengupdate data kamar (termasuk mengubah ketersediaan)
 * @route   PUT /api/admin/rooms/:id
 * @access  Private (Admin)
 */
const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new ApiError(404, 'Kamar tidak ditemukan');

    // Kalau hotelId ikut diganti, pastikan hotel tujuan benar-benar ada
    if (req.body.hotelId !== undefined) {
      const hotelExists = await Hotel.findById(req.body.hotelId);
      if (!hotelExists) throw new ApiError(404, 'Hotel dengan ID tersebut tidak ditemukan');
    }

    // Hanya field yang di-whitelist yang boleh diupdate (anti mass assignment)
    UPDATABLE_ROOM_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) room[field] = req.body[field];
    });
    await room.save();

    res.status(200).json({ success: true, message: 'Kamar berhasil diperbarui', data: room });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin menghapus kamar
 * @route   DELETE /api/admin/rooms/:id
 * @access  Private (Admin)
 */
const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new ApiError(404, 'Kamar tidak ditemukan');

    await room.deleteOne();

    res.status(200).json({ success: true, message: 'Kamar berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom };
