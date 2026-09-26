const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  cancelBooking,
  downloadInvoice,
} = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Pemesanan kamar oleh User (memerlukan login)
 */

// Semua route booking di bawah ini WAJIB login (protect)
router.use(protect);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: User melakukan pemesanan kamar
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roomId, startDate, endDate]
 *             properties:
 *               roomId:
 *                 type: string
 *                 example: 665f1c2e8b1e4a0012a3b456
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-10"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-13"
 *     responses:
 *       201:
 *         description: Booking berhasil dibuat dengan status Pending, notifikasi WA terkirim
 *       400:
 *         description: Data tidak valid / kamar tidak tersedia
 *       404:
 *         description: Kamar tidak ditemukan
 *       409:
 *         description: Kamar sudah dipesan untuk rentang tanggal tersebut (double booking)
 */
router.post('/', createBooking);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: User melihat riwayat booking miliknya sendiri
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Dikonfirmasi, Ditolak, Cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Riwayat booking berhasil diambil (paginated)
 */
router.get('/', getMyBookings);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   patch:
 *     summary: User membatalkan pesanannya sendiri
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking berhasil dibatalkan
 *       403:
 *         description: Bukan pemilik booking
 *       404:
 *         description: Booking tidak ditemukan
 */
router.patch('/:id/cancel', cancelBooking);

/**
 * @swagger
 * /api/bookings/{id}/invoice:
 *   get:
 *     summary: User mengunduh invoice booking dalam bentuk PDF
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File PDF invoice, link download juga dikirim via WhatsApp
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Bukan pemilik booking
 *       404:
 *         description: Booking tidak ditemukan
 */
router.get('/:id/invoice', downloadInvoice);

module.exports = router;