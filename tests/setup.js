// Environment untuk pengujian (tidak memakai .env asli & tidak menyentuh database)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_yang_cukup_panjang_untuk_pengujian_123456';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/not_used_in_tests';
process.env.BASE_URL = 'http://localhost:5000';
process.env.JWT_EXPIRES_IN = '1h';
