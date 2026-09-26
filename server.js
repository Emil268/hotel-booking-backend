require('dotenv').config();

const express = require('express');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

// Import seluruh modul routing
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');

// Hubungkan ke MongoDB sebelum server menerima request
connectDB();

const app = express();

// ===== GLOBAL MIDDLEWARES =====
app.use(express.json()); // parsing body JSON
app.use(express.urlencoded({ extended: true })); // parsing body form-urlencoded

// CATATAN KEAMANAN: folder invoices/ SENGAJA TIDAK di-serve sebagai static file lagi.
// Sebelumnya (`express.static('/invoices')`) siapa pun yang menebak pola nama file
// (invoice-<bookingId>.pdf) bisa mengunduh invoice milik user lain tanpa autentikasi.
// Sekarang invoice hanya bisa diakses lewat:
//   1) GET /api/bookings/:id/invoice (butuh login, hanya pemilik booking)
//   2) GET /api/invoices/:token (link di WA, token JWT singkat & unik per booking)
// Lihat routes/invoiceRoutes.js & utils/invoiceToken.js.

// ===== DOKUMENTASI SWAGGER =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===== ROUTES =====
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hotel Booking API is running 🚀',
    documentation: `${process.env.BASE_URL || 'http://localhost:5000'}/api-docs`,
  });
});

app.use('/api/auth', authRoutes); // registrasi & login
app.use('/api/rooms', roomRoutes); // daftar kamar (public)
app.use('/api/bookings', bookingRoutes); // booking oleh user (protected)
app.use('/api/admin', adminRoutes); // seluruh fitur admin (protected + RBAC)
app.use('/api/invoices', invoiceRoutes); // download invoice via token bertanda tangan (dipakai link WA)

// Ignores favicon request agar tidak memicu error log
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ===== ERROR HANDLING (WAJIB PALING BAWAH) =====
app.use(notFound); // 404 handler untuk route yang tidak terdaftar
app.use(errorHandler); // centralized global error handler

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`📚 Swagger docs tersedia di http://localhost:${PORT}/api-docs`);
});

module.exports = app; // diekspor agar bisa dipakai untuk automated testing (mis. supertest)