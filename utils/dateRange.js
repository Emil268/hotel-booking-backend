const ApiError = require('./ApiError');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * parseDateRange
 * Satu-satunya tempat aturan tanggal menginap didefinisikan, dipakai oleh
 * POST /api/bookings DAN GET /api/rooms?checkIn&checkOut agar konsisten:
 *  - format tanggal harus valid
 *  - check-out harus SETELAH check-in
 *  - check-in tidak boleh di masa lalu (dibandingkan awal hari ini)
 * Kebijakan malam: dibulatkan ke atas, minimal 1 malam.
 */
const parseDateRange = (startInput, endInput, { allowPast = false } = {}) => {
  const start = new Date(startInput);
  const end = new Date(endInput);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(400, 'Format tanggal tidak valid');
  }
  if (end <= start) {
    throw new ApiError(400, 'Tanggal check-out harus setelah tanggal check-in');
  }

  if (!allowPast) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (start < startOfToday) {
      throw new ApiError(400, 'Tanggal check-in tidak boleh di masa lalu');
    }
  }

  return { start, end, totalDays: Math.ceil((end - start) / MS_PER_DAY) };
};

module.exports = { parseDateRange, MS_PER_DAY };
