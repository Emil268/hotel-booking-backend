const request = require('supertest');
const app = require('../app');

describe('Aplikasi dasar, keamanan header, dan health check', () => {
  test('GET / -> 200', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /health -> 503 saat database belum terhubung', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ success: false, status: 'degraded' });
    expect(res.body.database.status).toBe('disconnected');
  });

  test('endpoint tidak dikenal -> 404 dengan format error konsisten', async () => {
    const res = await request(app).get('/api/tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, statusCode: 404 });
  });

  test('folder invoices TIDAK lagi diakses publik (static serving dicabut)', async () => {
    const res = await request(app).get('/invoices/invoice-BK-APA-SAJA.pdf');
    expect(res.status).toBe(404);
  });

  test('Helmet aktif: header keamanan ada & x-powered-by disembunyikan', async () => {
    const res = await request(app).get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('JSON rusak -> 400 (bukan 500)', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/JSON/);
  });

  test('body terlalu besar (>10kb) -> 413', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });
});

describe('CORS', () => {
  const build = (origins) => {
    process.env.CORS_ORIGINS = origins;
    const a = app.createApp();
    delete process.env.CORS_ORIGINS;
    return a;
  };

  test('origin yang diizinkan mendapat header CORS', async () => {
    const res = await request(build('https://app.example.com')).get('/').set('Origin', 'https://app.example.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  test('origin lain TIDAK mendapat header CORS', async () => {
    const res = await request(build('https://app.example.com')).get('/').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('di production tanpa CORS_ORIGINS, origin browser ditolak', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production'; // CORS membaca NODE_ENV saat request masuk -> tahan sampai selesai
    try {
      const res = await request(app.createApp()).get('/').set('Origin', 'https://apa-saja.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

describe('Rate limiting', () => {
  test('login dibatasi: percobaan ke-4 (batas=3) -> 429', async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '3';
    const limited = app.createApp();
    delete process.env.AUTH_RATE_LIMIT_MAX;

    const statuses = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(limited).post('/api/auth/login').send({});
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 3)).toEqual([400, 400, 400]); // lolos limiter, gagal validasi
    expect(statuses[3]).toBe(429);
  });
});
