const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registrasi & Login User
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrasi user baru
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phoneNumber]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Budi Santoso
 *               email:
 *                 type: string
 *                 example: budi@example.com
 *               password:
 *                 type: string
 *                 example: user123
 *               phoneNumber:
 *                 type: string
 *                 example: "628119876543"
 *     responses:
 *       201:
 *         description: Registrasi berhasil, mengembalikan data user & token JWT
 *       400:
 *         description: Data tidak valid / email sudah terdaftar
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user dan mendapatkan token JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: budi@example.com
 *               password:
 *                 type: string
 *                 example: user123
 *     responses:
 *       200:
 *         description: Login berhasil, mengembalikan token JWT
 *       401:
 *         description: Email atau password salah
 */
router.post('/login', login);

module.exports = router;
