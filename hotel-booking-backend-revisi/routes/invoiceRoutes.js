const express = require('express');
const router = express.Router();
const { downloadInvoiceByToken } = require('../controllers/invoiceController');

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Download invoice lewat link bertanda tangan (dipakai oleh link WhatsApp)
 */

/**
 * @swagger
 * /api/invoices/{token}:
 *   get:
 *     summary: Download invoice PDF menggunakan token bertanda tangan (bukan login biasa)
 *     tags: [Invoices]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token yang dikirim lewat pesan WhatsApp saat invoice pertama kali diminta
 *     responses:
 *       200:
 *         description: File PDF invoice
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Token tidak valid / sudah kedaluwarsa
 *       404:
 *         description: Booking tidak ditemukan
 */
router.get('/:token', downloadInvoiceByToken);

module.exports = router;
