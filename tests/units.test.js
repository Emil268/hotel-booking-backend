const { validateEnv } = require('../config/env');
const logger = require('../utils/logger');
const { parseDateRange } = require('../utils/dateRange');
const { generateInvoiceToken, verifyInvoiceToken } = require('../utils/invoiceToken');
const { getPagination, buildPaginationMeta } = require('../utils/paginate');
const { PASSWORD_MIN_LENGTH } = require('../utils/constants');
const { registerSchema } = require('../validators/schemas');
const User = require('../models/User');
const { daysFromNow } = require('./helpers');

describe('validateEnv', () => {
  const good = { MONGO_URI: 'mongodb://x', JWT_SECRET: 'a'.repeat(40) };

  test('konfigurasi lengkap -> tanpa error', () => {
    expect(validateEnv(good).errors).toEqual([]);
  });
  test('JWT_SECRET kosong -> error (server menolak start)', () => {
    expect(validateEnv({ MONGO_URI: 'x' }).errors).toContain('JWT_SECRET wajib diisi di .env');
  });
  test('MONGO_URI kosong -> error', () => {
    expect(validateEnv({ JWT_SECRET: 'a'.repeat(40) }).errors.join()).toMatch(/MONGO_URI/);
  });
  test('secret pendek: warning di development, error di production', () => {
    const short = { MONGO_URI: 'x', JWT_SECRET: 'pendek' };
    expect(validateEnv(short).errors).toEqual([]);
    expect(validateEnv(short).warnings.length).toBeGreaterThan(0);
    expect(validateEnv({ ...short, NODE_ENV: 'production' }).errors.length).toBeGreaterThan(0);
  });
  test('secret contoh dari .env.example ditolak di production', () => {
    const env = { MONGO_URI: 'x', NODE_ENV: 'production', JWT_SECRET: 'ganti_dengan_secret_key_yang_sangat_rahasia' };
    expect(validateEnv(env).errors.join()).toMatch(/nilai contoh/);
  });
});

describe('logger', () => {
  test('field sensitif disensor, bersarang sekalipun', () => {
    const out = logger.redact({ email: 'a@b.co', password: 'rahasia', nested: { token: 'abc', Authorization: 'Bearer x' } });
    expect(out).toEqual({ email: 'a@b.co', password: '[REDACTED]', nested: { token: '[REDACTED]', Authorization: '[REDACTED]' } });
  });
  test('maskPhone menyisakan 4 digit terakhir', () => {
    expect(logger.maskPhone('6285213818167')).toBe('*********8167');
  });
});

describe('parseDateRange (aturan tanggal bersama)', () => {
  test('rentang valid -> hitung malam (dibulatkan ke atas)', () => {
    expect(parseDateRange(daysFromNow(2), daysFromNow(5)).totalDays).toBe(3);
  });
  test('check-out sebelum/sama dengan check-in -> 400', () => {
    expect(() => parseDateRange(daysFromNow(3), daysFromNow(3))).toThrow(/setelah tanggal check-in/);
    expect(() => parseDateRange(daysFromNow(4), daysFromNow(3))).toThrow(/setelah tanggal check-in/);
  });
  test('check-in masa lalu -> 400', () => {
    expect(() => parseDateRange('2020-01-01', '2020-01-03')).toThrow(/masa lalu/);
  });
  test('format salah -> 400', () => {
    expect(() => parseDateRange('bukan-tanggal', daysFromNow(3))).toThrow(/Format tanggal/);
  });
});

describe('Konsistensi aturan password (controller/validator vs model)', () => {
  const base = { name: 'Budi', email: 'budi@gmail.com', phoneNumber: '081234567890' };

  test('model User memakai PASSWORD_MIN_LENGTH yang sama', () => {
    expect(User.schema.path('password').options.minlength[0]).toBe(PASSWORD_MIN_LENGTH);
  });
  test('validator menolak 7 karakter & menerima 8 karakter', () => {
    expect(registerSchema.safeParse({ ...base, password: 'a'.repeat(PASSWORD_MIN_LENGTH - 1) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'a'.repeat(PASSWORD_MIN_LENGTH) }).success).toBe(true);
  });
});

describe('token invoice', () => {
  test('round-trip token -> bookingId', () => {
    expect(verifyInvoiceToken(generateInvoiceToken('abc123'))).toBe('abc123');
  });
  test('token login biasa tidak bisa dipakai sebagai token invoice', () => {
    const { signToken } = require('./helpers');
    expect(() => verifyInvoiceToken(signToken())).toThrow();
  });
});

describe('pagination', () => {
  test('default, batas atas limit, dan meta', () => {
    expect(getPagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
    expect(getPagination({ page: '-3', limit: '9999' })).toEqual({ page: 1, limit: 100, skip: 0 });
    expect(buildPaginationMeta(23, 2, 10)).toMatchObject({ totalPages: 3, hasNextPage: true, hasPrevPage: true });
  });
});
