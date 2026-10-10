/**
 * app.js
 * Hanya MERAKIT aplikasi Express (middleware + routes) dan mengekspornya.
 * Tidak menyalakan server & tidak menyambung ke database -> aman di-import oleh
 * pengujian otomatis (Supertest). Penyalaan server ada di server.js.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const requestLogger = require('./middlewares/requestLogger');
const { createLimiters } = require('./middlewares/rateLimiters');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const healthRoutes = require('./routes/healthRoutes');

/**
 * CORS: hanya origin di daftar CORS_ORIGINS (pisahkan dengan koma) yang diizinkan.
 * - Request tanpa header Origin (Postman, curl, server-to-server) selalu diizinkan.
 * - Jika CORS_ORIGINS kosong: development -> semua origin boleh, production -> ditolak.
 */
const buildCorsOptions = () => {
  const allowed = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowed.length === 0) return callback(null, process.env.NODE_ENV !== 'production');
      return callback(null, allowed.includes(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };
};

const createApp = () => {
  const app = express();
  const { apiLimiter, authLimiter } = createLimiters();

  // Di belakang reverse proxy (Nginx, Railway, Render, dst.) set TRUST_PROXY=1 agar
  // rate limiting membaca IP klien yang asli, bukan IP proxy.
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
  }

  // Swagger UI dipasang SEBELUM helmet: CSP bawaan helmet akan memblokir script inline Swagger UI.
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.use(requestLogger);

  // Batasi ukuran body secara eksplisit (default Express 100kb -> diperketat)
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  app.use('/health', healthRoutes);

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Hotel Booking API is running',
      documentation: `${process.env.BASE_URL || 'http://localhost:5000'}/api-docs`,
    });
  });

  // CATATAN KEAMANAN: folder invoices/ TIDAK di-serve sebagai static file.
  // Invoice hanya bisa diakses lewat:
  //   1) GET /api/bookings/:id/invoice (login, hanya pemilik booking)
  //   2) GET /api/invoices/:token      (link WA, token JWT singkat & unik per booking)
  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter, authRoutes); // batas lebih ketat untuk login & registrasi
  app.use('/api/rooms', roomRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/invoices', invoiceRoutes);

  app.get('/favicon.ico', (req, res) => res.status(204).end());

  // ===== ERROR HANDLING (WAJIB PALING BAWAH) =====
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

const app = createApp();
app.createApp = createApp; // memudahkan test yang butuh konfigurasi env berbeda
module.exports = app;
