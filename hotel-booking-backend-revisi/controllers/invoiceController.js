const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const generateInvoicePDF = require('../utils/generateInvoice');
const { verifyInvoiceToken } = require('../utils/invoiceToken');

/**
 * @desc    Mengunduh invoice PDF lewat link bertanda tangan (dikirim via WhatsApp),
 *          TANPA memerlukan header Authorization biasa.
 * @route   GET /api/invoices/:token
 * @access  Public (tapi hanya bisa diakses dengan token valid & belum kedaluwarsa)
 *
 * Ini menggantikan pendekatan lama `app.use('/invoices', express.static(...))`
 * yang membuat SEMUA file di folder invoices/ bisa diakses siapa pun yang
 * menebak nama filenya. Token di sini unik per booking, ditandatangani (JWT),
 * dan otomatis kedaluwarsa (default 1 jam).
 */
const downloadInvoiceByToken = async (req, res, next) => {
  try {
    let bookingId;
    try {
      bookingId = verifyInvoiceToken(req.params.token);
    } catch (err) {
      throw new ApiError(401, 'Link invoice tidak valid atau sudah kedaluwarsa');
    }

    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email phoneNumber')
      .populate({
        path: 'roomId',
        populate: { path: 'hotelId', select: 'name location' },
      });

    if (!booking) {
      throw new ApiError(404, 'Booking tidak ditemukan');
    }

    const { fileName, filePath } = await generateInvoicePDF(booking);

    res.status(200).download(filePath, fileName, (err) => {
      if (err && !res.headersSent) {
        next(new ApiError(500, 'Gagal mengunduh file invoice'));
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { downloadInvoiceByToken };
