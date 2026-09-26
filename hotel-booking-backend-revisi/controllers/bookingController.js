const Booking = require('../models/Booking');
const Room = require('../models/Room');
const ApiError = require('../utils/ApiError');
const generateBookingId = require('../utils/generateBookingId');
const generateInvoicePDF = require('../utils/generateInvoice');
const sendWhatsAppNotification = require('../utils/sendWhatsApp');
const { generateInvoiceToken } = require('../utils/invoiceToken');
const { getPagination, buildPaginationMeta } = require('../utils/paginate');

// Status booking yang masih dianggap "aktif" dan bisa menyebabkan bentrok jadwal
const ACTIVE_BOOKING_STATUSES = ['Pending', 'Dikonfirmasi'];

/**
 * @desc    User melakukan pemesanan kamar
 * @route   POST /api/bookings
 * @access  Private (User)
 */
const createBooking = async (req, res, next) => {
  try {
    const { roomId, startDate, endDate } = req.body;

    if (!roomId || !startDate || !endDate) {
      throw new ApiError(400, 'roomId, startDate, dan endDate wajib diisi');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(400, 'Format tanggal tidak valid');
    }
    if (end <= start) {
      throw new ApiError(400, 'Tanggal check-out harus setelah tanggal check-in');
    }

    // Tolak check-in yang tanggalnya sudah lewat (dibandingkan awal hari ini)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (start < startOfToday) {
      throw new ApiError(400, 'Tanggal check-in tidak boleh di masa lalu');
    }

    const room = await Room.findById(roomId).populate('hotelId', 'name location');
    if (!room) {
      throw new ApiError(404, 'Kamar tidak ditemukan');
    }
    if (!room.isAvailable) {
      throw new ApiError(400, 'Kamar sedang tidak tersedia untuk dipesan');
    }

    // Cegah double booking: cek apakah ada booking Pending/Dikonfirmasi lain
    // di kamar yang sama, yang rentang tanggalnya overlap dengan permintaan baru.
    // Overlap terjadi jika: existing.startDate < end BARU  DAN  existing.endDate > start BARU
    // Catatan: pengecekan ini belum dibungkus dalam Mongo transaction, jadi pada beban
    // request bersamaan yang sangat tinggi masih ada celah race condition kecil.
    // Untuk hardening lebih lanjut di production, gunakan MongoDB replica set + session
    // transaction, atau unique partial index berbasis rentang tanggal.
    const overlappingBooking = await Booking.findOne({
      roomId: room._id,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      startDate: { $lt: end },
      endDate: { $gt: start },
    });

    if (overlappingBooking) {
      throw new ApiError(
        409,
        'Kamar sudah dipesan untuk sebagian/seluruh rentang tanggal tersebut, silakan pilih tanggal lain'
      );
    }

    // Hitung jumlah malam menginap (dibulatkan ke atas agar adil untuk selisih jam;
    // kebijakan: minimal dihitung 1 malam meskipun durasi menginap kurang dari 24 jam)
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.ceil((end - start) / msPerDay);

    // Hitung total harga otomatis: jumlah malam x harga per malam
    const totalPrize = totalDays * room.pricePerNight;

    const booking = await Booking.create({
      userId: req.user._id,
      roomId: room._id,
      bookingId: generateBookingId(), // ID booking unik
      startDate: start,
      endDate: end,
      totalDays,
      totalPrize,
      status: 'Pending', // status awal WAJIB Pending
    });

    // Kirim notifikasi WA "Booking Pending" secara best-effort (tidak menggagalkan response)
    const waMessage =
      `📋 *Booking Diterima (Pending)*\n\n` +
      `Booking ID: ${booking.bookingId}\n` +
      `Hotel: ${room.hotelId.name}\n` +
      `Tipe Kamar: ${room.roomType}\n` +
      `Check-in: ${start.toLocaleDateString('id-ID')}\n` +
      `Check-out: ${end.toLocaleDateString('id-ID')}\n` +
      `Total: Rp ${totalPrize.toLocaleString('id-ID')}\n\n` +
      `Status booking Anda saat ini *Pending*, mohon tunggu konfirmasi dari Admin.`;

    sendWhatsAppNotification(req.user.phoneNumber, waMessage);

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
 *
 * Mendukung filter opsional: ?status=Pending&page=1&limit=10
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
 * @route   POST /api/bookings/:id/cancel
 * @access  Private (User - hanya booking miliknya sendiri)
 */
const cancelBooking = async (req, res, next) => {
  try {
    // Di-populate agar data userId dan phoneNumber-nya bisa diakses untuk Fonnte
    const booking = await Booking.findById(req.params.id).populate('userId', 'name phoneNumber');

    if (!booking) {
      throw new ApiError(404, 'Booking tidak ditemukan');
    }

    // Pastikan user hanya bisa membatalkan booking miliknya sendiri
    if (booking.userId._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Anda tidak memiliki akses untuk membatalkan booking ini');
    }

    if (['Cancelled', 'Ditolak'].includes(booking.status)) {
      throw new ApiError(400, `Booking dengan status '${booking.status}' tidak dapat dibatalkan lagi`);
    }

    booking.status = 'Cancelled';
    await booking.save();

    // Kirim notifikasi WA bahwa booking telah dibatalkan
    const waMessage = 
      `❌ *Booking Dibatalkan*\n\n` +
      `Booking ID: ${booking.bookingId}\n` +
      `Status pesanan Anda telah diubah menjadi *Cancelled* (Dibatalkan).\n` +
      `Terima kasih telah menggunakan layanan kami.`;

    sendWhatsAppNotification(booking.userId.phoneNumber, waMessage);

    res.status(200).json({
      success: true,
      message: 'Booking berhasil dibatalkan',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    User mengunduh invoice booking dalam bentuk PDF
 * @route   GET /api/bookings/:id/invoice
 * @access  Private (User - hanya booking miliknya sendiri)
 */
const downloadInvoice = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email phoneNumber')
      .populate({
        path: 'roomId',
        populate: { path: 'hotelId', select: 'name location' },
      });

    if (!booking) {
      throw new ApiError(404, 'Booking tidak ditemukan');
    }

    if (booking.userId._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Anda tidak memiliki akses ke invoice ini');
    }

    // Generate ulang PDF setiap request agar data selalu up to date
    const { fileName, filePath } = await generateInvoicePDF(booking);

    booking.invoiceFile = fileName;
    await booking.save();

    // Catatan keamanan: folder invoices/ TIDAK di-serve sebagai static file lagi
    // (sebelumnya siapa pun yang menebak pola nama file bisa mengunduh invoice orang
    // lain). Sebagai gantinya, link yang dikirim via WA memakai token bertanda tangan
    // (JWT) yang singkat masa berlakunya dan hanya berlaku untuk booking ini.
    const invoiceToken = generateInvoiceToken(booking._id.toString());
    const downloadLink = `${process.env.BASE_URL}/api/invoices/${invoiceToken}`;
    const waMessage =
      `🧾 *Invoice Booking Anda Siap*\n\n` +
      `Booking ID: ${booking.bookingId}\n` +
      `Silakan unduh invoice Anda di link berikut (berlaku 1 jam):\n${downloadLink}`;
    sendWhatsAppNotification(booking.userId.phoneNumber, waMessage);

    // Kirim file PDF langsung sebagai response agar bisa langsung diunduh browser/Postman
    res.status(200).download(filePath, fileName, (err) => {
      if (err && !res.headersSent) {
        next(new ApiError(500, 'Gagal mengunduh file invoice'));
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getMyBookings, cancelBooking, downloadInvoice };