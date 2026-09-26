const swaggerJSDoc = require('swagger-jsdoc');

/**
 * Konfigurasi definisi dasar Swagger (OpenAPI 3.0).
 * Anotasi endpoint diambil otomatis dari komentar JSDoc
 * di dalam folder ./routes/*.js
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Hotel Booking API',
    version: '1.0.0',
    description:
      'Dokumentasi RESTful API untuk sistem Booking Hotel. ' +
      'Mencakup autentikasi user, manajemen kamar/hotel, proses booking, ' +
      'invoice PDF, notifikasi WhatsApp (Fonnte), dan panel admin (RBAC).',
    contact: {
      name: 'Tech Lead - Backend Team',
    },
  },
  servers: [
    {
      url: process.env.BASE_URL || 'http://localhost:5000',
      description: 'Server Utama',
    },
  ],
  components: {
    // Skema keamanan Bearer Token (JWT) yang dipakai di endpoint yang butuh login
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  // Terapkan bearerAuth sebagai default keamanan global (bisa di-override per endpoint)
  security: [{ bearerAuth: [] }],
};

const options = {
  swaggerDefinition,
  // Lokasi file yang berisi komentar anotasi @swagger
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
