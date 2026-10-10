const Booking = require('../models/Booking');
const Room = require('../models/Room');
const ApiError = require('../utils/ApiError');
const generateBookingId = require('../utils/generateBookingId');
const ensureInvoiceFile = require('../utils/invoiceFile');
const notify = require('../utils/notify');
const { generateInvoiceToken } = require('../utils/invoiceToken');
const { getPagination, buildPaginationMeta } = require('../utils/paginate');
const { parseDateRange } = require('../utils/dateRange');
const { ACTIVE_BOOKING_STATUSES } = require('../utils/constants');

const CONFLICT_MESSAGE =
  'Kamar sudah dipesan untuk sebagian/seluruh rentang tanggal tersebut, silakan pilih tanggal lain';

// Cooldown pengiriman ulang link invoice via WA (sama dengan masa berlaku token invoice: 1 jam)
const INVOICE_NOTIFY_COOLDOWN_MS = 60 * 60 * 1000;

/** Query "ada booking aktif lain di kamar ini yang tanggalnya overlap?" */
const findOverlap = (roomId, start, end, excludeId) =>
  Booking.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    roomId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    startDate: { $lt: end },
    endDate: { $gt: start },
  });

/**
 * @desc    User melakukan pemesanan kamar
 * @route   POST /api/bookings
 * @access  Private (User)
 *
 * Input sudah divalidasi (format) oleh middleware validate(createBookingSchema).
 * Aturan tanggal (urutan & tidak boleh masa lalu) ada di utils/dateRange.js.
 */
const createBooking = async (req, res, next) => {
  try {
    const { roomId, startDate, endDate } = req.body;
    const { start, end, totalDays } = parseDateRange(startDate, endDate);

    const room = await Room.findById(roomId).populate('hotelId', 'name location');
    if (!room) throw new ApiError(404, 'Kamar tidak ditemukan');
    if (!room.isAvailable) throw new ApiError(400, 'Kamar sedang tidak tersedia untuk dipesan');

    // 1) Pengecekan cepat: tolak lebih awal untuk kasus bentrok yang umum.
    if (await findOverlap(room._id, start, end)) throw new ApiError(409, CONFLICT_MESSAGE);

    const totalPrice = totalDays * room.pricePerNight;

    const booking = await Booking.create({
      userId: req.user._id,
      roomId: room._id,
      bookingId: generateBookingId(),
      startDate: start,
      endDate: end,
      totalDays,
      totalPrice,
      status: 'Pending',
    });

    // 2) Verifikasi setelah menyimpan (menangani permintaan BERSAMAAN).
    //    Dua request yang lolos pengecekan di langkah 1 secara bersamaan sama-sama
    //    tersimpan, tetapi hanya boleh ada satu yang bertahan: karena setiap request
    //    menyimpan dulu baru memeriksa, minimal salah satunya PASTI melihat yang lain
    //    dan membatalkan dirinya (menghapus booking-nya sendiri). Tidak butuh replica
    //    set / transaksi MongoDB, dan tidak pernah menghasilkan dua booking aktif yang
    //    bentrok. Trade-off: pada tabrakan sangat bersamaan, kedua request bisa sama-sama
    //    ditolak (409) -> aman, user tinggal mencoba lagi.
    if (await findOverlap(room._id, start, end, booking._id)) {
      await Booking.deleteOne({ _id: booking._id });
      throw new ApiError(409, CONFLICT_MESSAGE);
    }

    // Notifikasi best-effort: gagal/ganjil di sini TIDAK boleh menggagalkan booking.
    notify(req.user.phoneNumber, () =>
      `📋 *Booking Diterima (Pending)*\n\n` +
      `Booking ID: ${booking.bookingId}\n` +
      `Hotel: ${room.hotelId?.name ?? '-'}\n` +
      `Tipe Kamar: ${room.roomType}\n` +
      `Check-in: ${start.toLocaleDateString('id-ID')}\n` +
      `Check-out: ${end.toLocaleDateString('id-ID')}\n` +
      `Total: Rp ${totalPrice.toLocaleString('id-ID')}\n\n` +
      `Status booking Anda saat ini *Pending*, mohon tunggu konfirmasi dari Admin.`
    );

    res.status(201).json({
      success: true,
      message: 'Booking berhasil dibuat, menunggu konfirmasi Admin',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    User melihat riwayat booking miliknya sendiri
 * @route   GET /api/bookings
 * @access  Private (User)
 * Filter opsional: ?status=Pending&page=1&limit=10
 */
const getMyBookings = async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const { page, limit, skip } = getPagination(req.query);

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
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
 * @desc    User membatalkan pesanannya sendiri
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private (User - hanya booking miliknya sendiri)
 */
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('userId', 'name phoneNumber');

    if (!booking) throw new ApiError(404, 'Booking tidak ditemukan');

    if (booking.userId._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Anda tidak memiliki akses untuk membatalkan booking ini');
    }

    if (['Cancelled', 'Ditolak'].includes(booking.status)) {
      throw new ApiError(400, `Booking dengan status '${booking.status}' tidak dapat dibatalkan lagi`);
    }

    booking.status = 'Cancelled';
    await booking.save();

    notify(booking.userId.phoneNumber, () =>
      `❌ *Booking Dibatalkan*\n\n` +
      `Booking ID: ${booking.bookingId}\n` +
      `Status pesanan Anda telah diubah menjadi *Cancelled* (Dibatalkan).\n` +
      `Terima kasih telah menggunakan layanan kami.`
    );

    res.status(200).json({ success: true, message: 'Booking berhasil dibatalkan', data: booking });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    User mengunduh invoice booking dalam bentuk PDF
 * @route   GET /api/bookings/:id/invoice
 * @access  Private (User - hanya booking miliknya sendiri)
 *
 * - PDF dipakai ulang selama data booking belum berubah (lihat utils/invoiceFile.js).
 * - Link invoice via WhatsApp hanya dikirim jika belum pernah dikirim dalam 1 jam terakhir
 *   (cooldown), supaya menekan tombol unduh berkali-kali tidak menjadi spam WA.
 * - Akses file tetap dibatasi: hanya pemilik booking (JWT) atau pemegang token invoice.
 */
const downloadInvoice = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phoneNumber')
      .populate({ path: 'roomId', populate: { path: 'hotelId', select: 'name location' } });

    if (!booking) throw new ApiError(404, 'Booking tidak ditemukan');

    if (booking.userId._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Anda tidak memiliki akses ke invoice ini');
    }

    const { fileName, filePath } = await ensureInvoiceFile(booking);

    const lastSent = booking.invoiceNotifiedAt ? new Date(booking.invoiceNotifiedAt).getTime() : 0;
    if (Date.now() - lastSent > INVOICE_NOTIFY_COOLDOWN_MS) {
      // Token khusus invoice (JWT singkat, hanya untuk booking ini) -> link tidak bisa ditebak
      const invoiceToken = generateInvoiceToken(booking._id.toString());
      const downloadLink = `${process.env.BASE_URL}/api/invoices/${invoiceToken}`;

      notify(booking.userId.phoneNumber, () =>
        `🧾 *Invoice Booking Anda Siap*\n\n` +
        `Booking ID: ${booking.bookingId}\n` +
        `Silakan unduh invoice Anda di link berikut (berlaku 1 jam):\n${downloadLink}`
      );
      await Booking.updateOne({ _id: booking._id }, { invoiceNotifiedAt: new Date() }, { timestamps: false });
    }

    res.status(200).download(filePath, fileName, (err) => {
      if (err && !res.headersSent) next(new ApiError(500, 'Gagal mengunduh file invoice'));
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getMyBookings, cancelBooking, downloadInvoice };
