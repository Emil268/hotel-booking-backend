const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { parseDateRange } = require('../utils/dateRange');
const { ACTIVE_BOOKING_STATUSES } = require('../utils/constants');
const { getPagination, buildPaginationMeta } = require('../utils/paginate');

/**
 * @desc    Mendapatkan daftar kamar hotel yang tersedia
 * @route   GET /api/rooms
 * @access  Public
 *
 * Mendukung query filter opsional:
 *   ?search=<keyword>    -> pencarian nama/tipe kamar (misal: deluxe)
 *   ?hotelId=<id>        -> filter kamar berdasarkan hotel tertentu
 *   ?minPrice=&maxPrice= -> filter berdasarkan rentang harga
 *   ?checkIn=&checkOut=  -> HANYA kamar yang bebas pada rentang tanggal tersebut
 *                           (aturan tanggal & bentrok sama dengan POST /api/bookings)
 */
const getAvailableRooms = async (req, res, next) => {
  try {
    const { hotelId, minPrice, maxPrice, search, checkIn, checkOut } = req.query;

    // Hanya tampilkan kamar yang isAvailable = true
    const filter = { isAvailable: true };

    // Fitur pencarian berdasarkan tipe kamar (case-insensitive)
    if (search) {
      // escape karakter regex agar input user tidak bisa dipakai untuk regex injection / ReDoS
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.roomType = { $regex: escaped, $options: 'i' };
    }

    if (hotelId) filter.hotelId = hotelId;

    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
    }

    // Ketersediaan berdasarkan tanggal: buang kamar yang punya booking aktif yang overlap.
    if (checkIn && checkOut) {
      const { start, end } = parseDateRange(checkIn, checkOut);
      const bookedRoomIds = await Booking.find({
        status: { $in: ACTIVE_BOOKING_STATUSES },
        startDate: { $lt: end },
        endDate: { $gt: start },
      }).distinct('roomId');
      filter._id = { $nin: bookedRoomIds };
    }

    const { page, limit, skip } = getPagination(req.query);

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .populate('hotelId', 'name location rating') // ikut sertakan info hotel terkait
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Room.countDocuments(filter),
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

module.exports = { getAvailableRooms };