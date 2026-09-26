const Hotel = require('../models/Hotel');
const ApiError = require('../utils/ApiError');
const { getPagination, buildPaginationMeta } = require('../utils/paginate');

// Whitelist field yang boleh diubah lewat PUT /api/admin/hotels/:id
// (mencegah mass assignment terhadap field yang tidak dimaksudkan, mis. _id, timestamps, dll)
const UPDATABLE_HOTEL_FIELDS = ['name', 'location', 'description', 'rating'];

/**
 * @desc    Admin melihat semua hotel
 * @route   GET /api/admin/hotels
 * @access  Private (Admin)
 */
const getAllHotels = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [hotels, total] = await Promise.all([
      Hotel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Hotel.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      count: hotels.length,
      pagination: buildPaginationMeta(total, page, limit),
      data: hotels,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin melihat detail satu hotel
 * @route   GET /api/admin/hotels/:id
 * @access  Private (Admin)
 */
const getHotelById = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) throw new ApiError(404, 'Hotel tidak ditemukan');
    res.status(200).json({ success: true, data: hotel });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin menambahkan hotel baru
 * @route   POST /api/admin/hotels
 * @access  Private (Admin)
 */
const createHotel = async (req, res, next) => {
  try {
    const { name, location, description, rating } = req.body;

    if (!name || !location) {
      throw new ApiError(400, 'Nama dan lokasi hotel wajib diisi');
    }

    const hotel = await Hotel.create({ name, location, description, rating });
    res.status(201).json({ success: true, message: 'Hotel berhasil dibuat', data: hotel });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin mengupdate data hotel
 * @route   PUT /api/admin/hotels/:id
 * @access  Private (Admin)
 */
const updateHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) throw new ApiError(404, 'Hotel tidak ditemukan');

    // Hanya field yang di-whitelist yang boleh diupdate (anti mass assignment)
    UPDATABLE_HOTEL_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) hotel[field] = req.body[field];
    });
    await hotel.save();

    res.status(200).json({ success: true, message: 'Hotel berhasil diperbarui', data: hotel });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin menghapus hotel
 * @route   DELETE /api/admin/hotels/:id
 * @access  Private (Admin)
 */
const deleteHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) throw new ApiError(404, 'Hotel tidak ditemukan');

    await hotel.deleteOne();

    res.status(200).json({ success: true, message: 'Hotel berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllHotels, getHotelById, createHotel, updateHotel, deleteHotel };
