/**
 * utils/constants.js
 * Konstanta bersama agar aturan bisnis TIDAK berbeda antara controller, model,
 * validator, dan seed (mis. panjang minimal password).
 */
module.exports = {
  PASSWORD_MIN_LENGTH: 8,
  BOOKING_STATUSES: ['Pending', 'Dikonfirmasi', 'Ditolak', 'Cancelled'],
  // Status yang masih "memegang" kamar sehingga dianggap bentrok jadwal
  ACTIVE_BOOKING_STATUSES: ['Pending', 'Dikonfirmasi'],
  ROLES: ['User', 'Admin'],
};
