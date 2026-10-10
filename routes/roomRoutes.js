const express = require('express');
const router = express.Router();
const { getAvailableRooms } = require('../controllers/roomController');
const validate = require('../middlewares/validate');
const { roomSearchQuerySchema } = require('../validators/schemas');

/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Daftar kamar hotel yang tersedia
 */

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Melihat daftar kamar hotel yang tersedia
 *     tags: [Rooms]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Kata kunci pencarian tipe kamar (misal deluxe)
 *       - in: query
 *         name: hotelId
 *         schema:
 *           type: string
 *         description: Filter berdasarkan ID hotel
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: checkIn
 *         description: Tanggal check-in (YYYY-MM-DD). Wajib dipasangkan dengan checkOut. Hanya kamar yang BEBAS pada rentang tanggal ini yang dikembalikan.
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-12-01"
 *       - in: query
 *         name: checkOut
 *         description: Tanggal check-out (YYYY-MM-DD), harus setelah checkIn.
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-12-03"
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
 *         description: Daftar kamar tersedia berhasil diambil (paginated)
 *       400:
 *         description: Parameter tidak valid (mis. checkIn tanpa checkOut, atau checkOut <= checkIn)
 */
router.get('/', validate(roomSearchQuerySchema, 'query'), getAvailableRooms);

module.exports = router;