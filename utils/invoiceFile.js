const fs = require('fs');
const Booking = require('../models/Booking');
const generateInvoicePDF = require('./generateInvoice');

/**
 * ensureInvoiceFile
 * Mengembalikan file invoice booking. PDF hanya DIBUAT ULANG jika:
 *  - file belum pernah dibuat / sudah hilang dari disk, atau
 *  - data booking berubah sejak PDF dibuat (booking.updatedAt > waktu file).
 * Selain itu file yang sudah ada dipakai lagi, sehingga request berulang tidak
 * membebani CPU & disk. `booking` harus sudah di-populate (userId, roomId.hotelId).
 */
const ensureInvoiceFile = async (booking) => {
  const fileName = `invoice-${booking.bookingId}.pdf`;
  const filePath = require('path').join(generateInvoicePDF.INVOICE_DIR, fileName);

  let fresh = false;
  if (booking.invoiceFile && fs.existsSync(filePath)) {
    fresh = fs.statSync(filePath).mtime >= new Date(booking.updatedAt);
  }
  if (fresh) return { fileName, filePath, reused: true };

  const generated = await generateInvoicePDF(booking);
  // timestamps:false -> menyimpan nama file TIDAK mengubah updatedAt (kalau diubah, PDF dianggap basi terus)
  await Booking.updateOne({ _id: booking._id }, { invoiceFile: generated.fileName }, { timestamps: false });
  return { ...generated, reused: false };
};

module.exports = ensureInvoiceFile;
