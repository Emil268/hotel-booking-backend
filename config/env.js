/**
 * config/env.js
 * Validasi environment variable SEBELUM server berjalan (fail-fast).
 * Lebih baik server menolak start daripada berjalan dengan konfigurasi yang
 * tidak aman (mis. JWT_SECRET kosong -> token tidak bisa diverifikasi dengan benar).
 */
const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRETS = [
  'ganti_dengan_secret_key_yang_sangat_rahasia',
  'secret',
  'changeme',
];

const validateEnv = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const isProduction = env.NODE_ENV === 'production';

  if (!env.MONGO_URI) errors.push('MONGO_URI wajib diisi di .env');

  if (!env.JWT_SECRET) {
    errors.push('JWT_SECRET wajib diisi di .env');
  } else {
    if (PLACEHOLDER_SECRETS.includes(env.JWT_SECRET)) {
      (isProduction ? errors : warnings).push(
        'JWT_SECRET masih memakai nilai contoh dari .env.example, ganti dengan secret acak yang kuat'
      );
    }
    if (env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
      (isProduction ? errors : warnings).push(
        `JWT_SECRET terlalu pendek (${env.JWT_SECRET.length} karakter), gunakan minimal ${MIN_SECRET_LENGTH} karakter`
      );
    }
  }

  if (isProduction && !env.CORS_ORIGINS) {
    warnings.push('CORS_ORIGINS belum diisi, request lintas-origin (browser) akan ditolak di production');
  }

  return { errors, warnings };
};

module.exports = { validateEnv, MIN_SECRET_LENGTH };
