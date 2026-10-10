/**
 * Pengujian endpoint dengan Supertest. Model Mongoose di-mock sehingga tes berjalan
 * cepat dan TIDAK butuh MongoDB. Fokus: autentikasi, hak akses per role, validasi input,
 * pengecekan bentrok booking (termasuk skenario bersamaan), dan transisi status booking.
 */
jest.mock('../models/User', () => ({ findById: jest.fn(), findOne: jest.fn(), create: jest.fn() }));
jest.mock('../models/Room', () => ({ findById: jest.fn(), find: jest.fn(), countDocuments: jest.fn() }));
jest.mock('../models/Booking', () => ({
  findOne: jest.fn(), create: jest.fn(), deleteOne: jest.fn(),
  find: jest.fn(), countDocuments: jest.fn(), findById: jest.fn(), updateOne: jest.fn(),
}));
jest.mock('../utils/notify', () => jest.fn()); // jangan kirim WhatsApp sungguhan

const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const notify = require('../utils/notify');
const { signToken, daysFromNow } = require('./helpers');

const USER_ID = '6abf101b575b8fc9ddb12bb0';
const ADMIN_ID = '6abf101b575b8fc9ddb12bb1';
const ROOM_ID = '6abf173f575b8fc9ddb12bc3';
const BOOKING_ID = '6abfab0ac6b1c346e2979fe6';

const asUser = () => {
  User.findById.mockResolvedValue({ _id: USER_ID, role: 'User', phoneNumber: '6281234567890' });
  return { Authorization: `Bearer ${signToken(USER_ID, 'User')}` };
};
const asAdmin = () => {
  User.findById.mockResolvedValue({ _id: ADMIN_ID, role: 'Admin', phoneNumber: '6281234567891' });
  return { Authorization: `Bearer ${signToken(ADMIN_ID, 'Admin')}` };
};

beforeEach(() => jest.resetAllMocks());

describe('Autentikasi & registrasi', () => {
  test('register: role "Admin" dari body DIABAIKAN, tersimpan sebagai User', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (data) => ({ _id: USER_ID, ...data }));

    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'test@gmail.com', password: 'password123', phoneNumber: '081200000000', role: 'Admin',
    });

    expect(res.status).toBe(201);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'User' }));
    expect(res.body.data.user.role).toBe('User');
  });

  test('register: field wajib kosong -> 400', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/wajib diisi/);
  });

  test('register: password 7 karakter -> 400 (aturan sama dengan model)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'test@gmail.com', password: '1234567', phoneNumber: '081200000000',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minimal harus 8 karakter/);
    expect(User.create).not.toHaveBeenCalled();
  });

  test('register: email sudah terdaftar -> 400', async () => {
    User.findOne.mockResolvedValue({ _id: 'x' });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'ada@gmail.com', password: 'password123', phoneNumber: '081200000000',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Email sudah terdaftar/);
  });

  test('login: body kosong -> 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('Hak akses (RBAC)', () => {
  test('tanpa token -> 401', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Token tidak ditemukan/);
  });

  test('token palsu -> 401', async () => {
    const res = await request(app).get('/api/bookings').set('Authorization', 'Bearer token.palsu.sekali');
    expect(res.status).toBe(401);
  });

  test('user biasa mengakses endpoint admin -> 403', async () => {
    const res = await request(app).get('/api/admin/users').set(asUser());
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Hanya Admin/);
  });

  test('user biasa tidak bisa ubah status booking -> 403', async () => {
    const res = await request(app).put(`/api/admin/bookings/${BOOKING_ID}/status`).set(asUser()).send({ status: 'Dikonfirmasi' });
    expect(res.status).toBe(403);
  });

  test('admin: status di luar daftar -> 400 dari validator', async () => {
    const res = await request(app).put(`/api/admin/bookings/${BOOKING_ID}/status`).set(asAdmin()).send({ status: 'Selesai' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Status tidak valid/);
  });

  test('admin: update hotel tanpa field apapun -> 400', async () => {
    const res = await request(app).put('/api/admin/hotels/6abf16e0575b8fc9ddb12bbf').set(asAdmin()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Minimal satu field/);
  });

  test('invoice via token: token sembarang -> 401', async () => {
    const res = await request(app).get('/api/invoices/token-ngasal');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/bookings', () => {
  const room = { _id: ROOM_ID, roomType: 'Deluxe Double', pricePerNight: 500000, isAvailable: true, hotelId: { name: 'Grand Lampung' } };
  const body = () => ({ roomId: ROOM_ID, startDate: daysFromNow(10), endDate: daysFromNow(12) });
  const mockRoom = (r) => Room.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(r) });

  test('validasi: roomId bukan ObjectId -> 400', async () => {
    const res = await request(app).post('/api/bookings').set(asUser()).send({ ...body(), roomId: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/roomId/);
  });

  test('validasi: check-in di masa lalu -> 400', async () => {
    const res = await request(app).post('/api/bookings').set(asUser()).send({ roomId: ROOM_ID, startDate: '2020-01-01', endDate: '2020-01-03' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/masa lalu/);
  });

  test('validasi: check-out <= check-in -> 400', async () => {
    const res = await request(app).post('/api/bookings').set(asUser()).send({ roomId: ROOM_ID, startDate: daysFromNow(10), endDate: daysFromNow(10) });
    expect(res.status).toBe(400);
  });

  test('kamar tidak ada -> 404', async () => {
    mockRoom(null);
    const res = await request(app).post('/api/bookings').set(asUser()).send(body());
    expect(res.status).toBe(404);
  });

  test('kamar isAvailable=false -> 400', async () => {
    mockRoom({ ...room, isAvailable: false });
    const res = await request(app).post('/api/bookings').set(asUser()).send(body());
    expect(res.status).toBe(400);
  });

  test('bentrok jadwal terdeteksi di pengecekan awal -> 409, tidak ada yang disimpan', async () => {
    mockRoom(room);
    Booking.findOne.mockResolvedValue({ _id: 'booking-lain' });
    const res = await request(app).post('/api/bookings').set(asUser()).send(body());
    expect(res.status).toBe(409);
    expect(Booking.create).not.toHaveBeenCalled();
  });

  test('permintaan BERSAMAAN: lolos pengecekan awal tapi bentrok saat verifikasi -> booking sendiri dihapus & 409', async () => {
    mockRoom(room);
    Booking.findOne.mockResolvedValueOnce(null) // pengecekan awal: kosong
      .mockResolvedValueOnce({ _id: 'booking-kembaran' }); // verifikasi: ada booking lain yang ikut tersimpan
    Booking.create.mockResolvedValue({ _id: 'booking-saya' });
    Booking.deleteOne.mockResolvedValue({});

    const res = await request(app).post('/api/bookings').set(asUser()).send(body());

    expect(res.status).toBe(409);
    expect(Booking.deleteOne).toHaveBeenCalledWith({ _id: 'booking-saya' });
    expect(notify).not.toHaveBeenCalled();
  });

  test('berhasil: 201, total harga dihitung (2 malam x 500.000), WA dikirim', async () => {
    mockRoom(room);
    Booking.findOne.mockResolvedValue(null);
    Booking.create.mockImplementation(async (d) => ({ _id: 'baru', ...d }));

    const res = await request(app).post('/api/bookings').set(asUser()).send(body());

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'Pending', totalDays: 2, totalPrice: 1000000 });
    expect(res.body.data.totalPrize).toBeUndefined(); // nama field lama sudah tidak dipakai
    expect(notify).toHaveBeenCalledTimes(1);
  });
});

describe('PATCH /api/bookings/:id/cancel', () => {
  test('method yang benar adalah PATCH; POST tidak dikenal -> 404', async () => {
    const res = await request(app).post(`/api/bookings/${BOOKING_ID}/cancel`).set(asUser());
    expect(res.status).toBe(404);
  });
});

describe('GET /api/rooms (ketersediaan per tanggal)', () => {
  const chain = (rows) => ({ populate: () => ({ sort: () => ({ skip: () => ({ limit: () => Promise.resolve(rows) }) }) }) });

  test('checkIn tanpa checkOut -> 400', async () => {
    const res = await request(app).get(`/api/rooms?checkIn=${daysFromNow(5)}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/bersamaan/);
  });

  test('checkOut <= checkIn -> 400 (aturan sama dengan booking)', async () => {
    const res = await request(app).get(`/api/rooms?checkIn=${daysFromNow(6)}&checkOut=${daysFromNow(5)}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/setelah tanggal check-in/);
  });

  test('minPrice > maxPrice -> 400', async () => {
    const res = await request(app).get('/api/rooms?minPrice=900&maxPrice=100');
    expect(res.status).toBe(400);
  });

  test('kamar yang sudah dibooking pada rentang itu dikeluarkan dari hasil', async () => {
    Booking.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue(['kamar-terpakai-1', 'kamar-terpakai-2']) });
    Room.find.mockReturnValue(chain([]));
    Room.countDocuments.mockResolvedValue(0);

    const res = await request(app).get(`/api/rooms?checkIn=${daysFromNow(5)}&checkOut=${daysFromNow(7)}`);

    expect(res.status).toBe(200);
    expect(Room.find.mock.calls[0][0]._id).toEqual({ $nin: ['kamar-terpakai-1', 'kamar-terpakai-2'] });
    expect(res.body.pagination).toBeDefined();
  });

  test('tanpa tanggal: tidak ada pengecekan booking', async () => {
    Room.find.mockReturnValue(chain([]));
    Room.countDocuments.mockResolvedValue(0);
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(200);
    expect(Booking.find).not.toHaveBeenCalled();
  });

  test('kata kunci pencarian di-escape (anti regex injection)', async () => {
    Room.find.mockReturnValue(chain([]));
    Room.countDocuments.mockResolvedValue(0);
    await request(app).get('/api/rooms').query({ search: '(a+)+$' });
    expect(Room.find.mock.calls[0][0].roomType.$regex).toBe('\\(a\\+\\)\\+\\$');
  });
});

describe('Transisi status booking (admin)', () => {
  const mockBooking = (status) => {
    const booking = {
      _id: BOOKING_ID, bookingId: 'BK-TEST', status,
      userId: { phoneNumber: '6281234567890' }, roomId: { hotelId: { name: 'Grand Lampung' } },
      save: jest.fn().mockResolvedValue(true),
    };
    Booking.findById.mockReturnValue({ populate: () => ({ populate: () => Promise.resolve(booking) }) });
    return booking;
  };
  const put = (status) => request(app).put(`/api/admin/bookings/${BOOKING_ID}/status`).set(asAdmin()).send({ status });

  test('Pending -> Dikonfirmasi: 200 + notifikasi WA', async () => {
    const b = mockBooking('Pending');
    const res = await put('Dikonfirmasi');
    expect(res.status).toBe(200);
    expect(b.save).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test('Dikonfirmasi -> Pending: ditolak 400, tidak disimpan', async () => {
    const b = mockBooking('Dikonfirmasi');
    const res = await put('Pending');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/hanya boleh berubah ke: Cancelled/);
    expect(b.save).not.toHaveBeenCalled();
  });

  test.each(['Cancelled', 'Ditolak'])('status final %s tidak bisa diubah lagi', async (finalStatus) => {
    mockBooking(finalStatus);
    const res = await put('Dikonfirmasi');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/bersifat final/);
  });

  test('status sama dengan sebelumnya -> 400', async () => {
    mockBooking('Pending');
    const res = await put('Pending');
    expect(res.status).toBe(400);
  });
});
