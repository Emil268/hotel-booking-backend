const crypto = require('crypto');

/**
 * generateBookingId
 * Menghasilkan ID booking yang unik dan mudah dibaca, contoh: BK-1B2K9F-7X4Q
 * Format: BK-<timestamp base36>-<random 4 karakter>
 * Kombinasi timestamp + random membuat kemungkinan tabrakan (collision) sangat kecil.
 */
const generateBookingId = () => {
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `BK-${timestampPart}-${randomPart}`;
};

module.exports = generateBookingId;
