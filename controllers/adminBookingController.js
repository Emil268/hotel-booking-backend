const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const sendWhatsAppNotification = require('../utils/sendWhatsApp');
const { getPagination, buildPaginationMeta } = require('../utils/paginate');

/**
 * State machine sederhana untuk transisi status booking.
 * Ditolak & Cancelled bersifat terminal (tidak bisa diubah lagi oleh Admin).
 * Dari Dikonfirmasi hanya boleh berpindah ke Cancelled (mis. tamu batal setelah dikonfirmasi admin).
 */
const ALLOWED_STATUS_TRANSITIONS = {
  Pending: ['Dikonfirmasi', 'Ditolak', 'Cancelled'],
  Dikonfirmasi: ['Cancelled'],
  Ditolak: [],
  Cancelled: [],
};

/**
 * @desc    Admin melihat semua daftar pesanan dari seluruh user
 * @route   GET /api/admin/bookings
 * @access  Private (Admin)
 *
 * Mendukung filter opsional: ?status=Pending
 */
const getAllBookings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const { page, limit, skip } = getPagination(req.query);

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('userId', 'name email phoneNumber')
        .populate({
          path: 'roomId',
          select: 'roomType pricePerNight hotelId',
          populate: { path: 'hotelId', select: 'name location' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: bookings.length,
      pagination: buildPaginationMeta(total, page, limit),
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin mengubah status booking secara manual
 * @route   PUT /api/admin/bookings/:id/status
 * @access  Private (Admin)
 *
 * Body: { "status": "Dikonfirmasi" | "Ditolak" | "Pending" | "Cancelled" }
 * Setiap kali status diperbarui, sistem otomatis mengirim notifikasi WA ke user.
 */
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Dikonfirmasi', 'Ditolak', 'Cancelled'];

    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(400, `Status tidak valid. Gunakan salah satu dari: ${validStatuses.join(', ')}`);
    }

    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name phoneNumber')
      .populate({ path: 'roomId', populate: { path: 'hotelId', select: 'name' } });

    if (!booking) {
      throw new ApiError(404, 'Booking tidak ditemukan');
    }

    if (booking.status === status) {
      throw new ApiError(400, `Booking sudah berstatus '${status}', tidak ada perubahan`);
    }

    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[booking.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      throw new ApiError(
        400,
        `Transisi status tidak diizinkan: '${booking.status}' -> '${status}'. ` +
          (allowedNextStatuses.length
            ? `Status '${booking.status}' hanya boleh berubah ke: ${allowedNextStatuses.join(', ')}`
            : `Status '${booking.status}' bersifat final dan tidak bisa diubah lagi`)
      );
    }

    booking.status = status;
    await booking.save();

    // Kirim notifikasi WA otomatis ke user mengenai status terbaru (best-effort)
    const statusEmoji = {
      Dikonfirmasi: '✅',
      Ditolak: '❌',
      Pending: '⏳',
      Cancelled: '🚫',
    };

    const waMessage =
      `${statusEmoji[status] || 'ℹ️'} *Update Status Booking*\n\n` +
      `Booking ID: ${booking.bookingId}\n` +
      `Hotel: ${booking.roomId.hotelId.name}\n` +
      `Status terbaru: *${status}*\n\n` +
      `Terima kasih telah menggunakan layanan kami.`;

    sendWhatsAppNotification(booking.userId.phoneNumber, waMessage);

    res.status(200).json({
      success: true,
      message: `Status booking berhasil diperbarui menjadi '${status}'`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllBookings, updateBookingStatus };
