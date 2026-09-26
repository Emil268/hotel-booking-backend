const express = require('express');
const router = express.Router();
const { getAvailableRooms } = require('../controllers/roomController');

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
 */
router.get('/', getAvailableRooms);

module.exports = router;