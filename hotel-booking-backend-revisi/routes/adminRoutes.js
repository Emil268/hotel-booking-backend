const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');

const userCtrl = require('../controllers/adminUserController');
const hotelCtrl = require('../controllers/adminHotelController');
const roomCtrl = require('../controllers/adminRoomController');
const bookingCtrl = require('../controllers/adminBookingController');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Endpoint khusus Admin (Role-Based Access Control) - CRUD Users, Hotels, Rooms & kelola Booking
 */

// SEMUA route di file ini WAJIB login (protect) DAN wajib role Admin (adminOnly)
router.use(protect, adminOnly);

/* ==================== USERS (CRUD) ==================== */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: "[Admin] Melihat semua user"
 *     tags: [Admin]
 *     responses:
 *       200: { description: Daftar user berhasil diambil }
 *       403: { description: Akses ditolak, bukan Admin }
 *   post:
 *     summary: "[Admin] Membuat user baru (bisa langsung set role Admin)"
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phoneNumber]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               phoneNumber: { type: string }
 *               role: { type: string, enum: [User, Admin] }
 *     responses:
 *       201: { description: User berhasil dibuat }
 */
router.route('/users').get(userCtrl.getAllUsers).post(userCtrl.createUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: "[Admin] Melihat detail user"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Detail user }
 *       404: { description: User tidak ditemukan }
 *   put:
 *     summary: "[Admin] Mengupdate data user"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phoneNumber: { type: string }
 *               role: { type: string, enum: [User, Admin] }
 *     responses:
 *       200: { description: User berhasil diperbarui }
 *   delete:
 *     summary: "[Admin] Menghapus user"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User berhasil dihapus }
 */
router
  .route('/users/:id')
  .get(userCtrl.getUserById)
  .put(userCtrl.updateUser)
  .delete(userCtrl.deleteUser);

/* ==================== HOTELS (CRUD) ==================== */

/**
 * @swagger
 * /api/admin/hotels:
 *   get:
 *     summary: "[Admin] Melihat semua hotel"
 *     tags: [Admin]
 *     responses:
 *       200: { description: Daftar hotel berhasil diambil }
 *   post:
 *     summary: "[Admin] Menambahkan hotel baru"
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, location]
 *             properties:
 *               name: { type: string }
 *               location: { type: string }
 *               description: { type: string }
 *               rating: { type: number }
 *     responses:
 *       201: { description: Hotel berhasil dibuat }
 */
router.route('/hotels').get(hotelCtrl.getAllHotels).post(hotelCtrl.createHotel);

/**
 * @swagger
 * /api/admin/hotels/{id}:
 *   get:
 *     summary: "[Admin] Melihat detail hotel"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Detail hotel }
 *   put:
 *     summary: "[Admin] Mengupdate data hotel"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Hotel berhasil diperbarui }
 *   delete:
 *     summary: "[Admin] Menghapus hotel"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Hotel berhasil dihapus }
 */
router
  .route('/hotels/:id')
  .get(hotelCtrl.getHotelById)
  .put(hotelCtrl.updateHotel)
  .delete(hotelCtrl.deleteHotel);

/* ==================== ROOMS (CRUD) ==================== */

/**
 * @swagger
 * /api/admin/rooms:
 *   get:
 *     summary: "[Admin] Melihat semua kamar (termasuk yang tidak tersedia)"
 *     tags: [Admin]
 *     responses:
 *       200: { description: Daftar kamar berhasil diambil }
 *   post:
 *     summary: "[Admin] Menambahkan kamar baru"
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hotelId, roomType, pricePerNight]
 *             properties:
 *               hotelId: { type: string }
 *               roomType: { type: string }
 *               pricePerNight: { type: number }
 *               isAvailable: { type: boolean }
 *     responses:
 *       201: { description: Kamar berhasil dibuat }
 */
router.route('/rooms').get(roomCtrl.getAllRooms).post(roomCtrl.createRoom);

/**
 * @swagger
 * /api/admin/rooms/{id}:
 *   get:
 *     summary: "[Admin] Melihat detail kamar"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Detail kamar }
 *   put:
 *     summary: "[Admin] Mengupdate data kamar"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Kamar berhasil diperbarui }
 *   delete:
 *     summary: "[Admin] Menghapus kamar"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Kamar berhasil dihapus }
 */
router
  .route('/rooms/:id')
  .get(roomCtrl.getRoomById)
  .put(roomCtrl.updateRoom)
  .delete(roomCtrl.deleteRoom);

/* ==================== BOOKINGS (Kelola oleh Admin) ==================== */

/**
 * @swagger
 * /api/admin/bookings:
 *   get:
 *     summary: "[Admin] Melihat semua daftar pesanan dari semua user"
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Dikonfirmasi, Ditolak, Cancelled]
 *     responses:
 *       200: { description: Daftar booking berhasil diambil }
 */
router.get('/bookings', bookingCtrl.getAllBookings);

/**
 * @swagger
 * /api/admin/bookings/{id}/status:
 *   put:
 *     summary: "[Admin] Mengubah status booking secara manual (mengirim notifikasi WA otomatis)"
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, Dikonfirmasi, Ditolak, Cancelled]
 *     responses:
 *       200: { description: Status booking berhasil diperbarui, notifikasi WA terkirim }
 *       400: { description: Status tidak valid }
 *       404: { description: Booking tidak ditemukan }
 */
router.put('/bookings/:id/status', bookingCtrl.updateBookingStatus);

module.exports = router;
