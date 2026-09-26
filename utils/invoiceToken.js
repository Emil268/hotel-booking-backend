const jwt = require('jsonwebtoken');

/**
 * Token khusus untuk akses invoice lewat link (dikirim via WhatsApp),
 * TERPISAH dari token login biasa:
 *  - payload hanya berisi bookingId + purpose (tidak bisa dipakai untuk akses endpoint lain)
 *  - masa berlaku singkat (default 1 jam)
 * Ini menggantikan pendekatan lama (folder invoices/ di-serve statis via express.static),
 * yang membuat siapa pun bisa mengunduh invoice orang lain hanya dengan menebak nama file.
 */
const INVOICE_TOKEN_EXPIRES_IN = process.env.INVOICE_TOKEN_EXPIRES_IN || '1h';

const generateInvoiceToken = (bookingId) => {
  return jwt.sign({ bookingId, purpose: 'invoice-download' }, process.env.JWT_SECRET, {
    expiresIn: INVOICE_TOKEN_EXPIRES_IN,
  });
};

/**
 * Mengembalikan bookingId jika token valid & memang bertujuan 'invoice-download'.
 * Melempar error (ditangkap oleh errorHandler global) jika token tidak valid/kedaluwarsa.
 */
const verifyInvoiceToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== 'invoice-download' || !decoded.bookingId) {
    throw new Error('Token invoice tidak valid');
  }
  return decoded.bookingId;
};

module.exports = { generateInvoiceToken, verifyInvoiceToken };
