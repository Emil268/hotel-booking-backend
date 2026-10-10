const { z } = require('zod');
const { PASSWORD_MIN_LENGTH, BOOKING_STATUSES, ROLES } = require('../utils/constants');

/* ---------- building blocks ---------- */
const reqString = (label, max = 100) =>
  z
    .string({ error: `${label} wajib diisi` })
    .trim()
    .min(1, `${label} wajib diisi`)
    .max(max, `${label} maksimal ${max} karakter`);

const objectId = (label) =>
  z.string({ error: `${label} wajib diisi` }).regex(/^[0-9a-fA-F]{24}$/, `Format ${label} tidak valid`);

const email = z
  .string({ error: 'Email wajib diisi' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Format email tidak valid'));

// Password: aturan SAMA dengan model User (lihat models/User.js) lewat PASSWORD_MIN_LENGTH.
// Maksimal 72 karena bcrypt hanya memakai 72 byte pertama.
const password = z
  .string({ error: 'Password wajib diisi' })
  .min(PASSWORD_MIN_LENGTH, `Password minimal harus ${PASSWORD_MIN_LENGTH} karakter`)
  .max(72, 'Password maksimal 72 karakter');

// Nomor WhatsApp Indonesia: 08xx..., 628xx..., atau +628xx...
const phoneNumber = z
  .string({ error: 'Nomor WhatsApp wajib diisi' })
  .trim()
  .regex(/^(?:\+?62|0)8\d{7,13}$/, 'Format nomor WhatsApp tidak valid (contoh: 081234567890)');

const dateString = (label) =>
  z
    .string({ error: `${label} wajib diisi` })
    .refine((v) => !isNaN(Date.parse(v)), `Format ${label} tidak valid`);

const atLeastOneField = (obj) => Object.keys(obj).length > 0;
const AT_LEAST_ONE = 'Minimal satu field harus diisi untuk diperbarui';

/* ---------- auth ---------- */
const registerSchema = z.object({ name: reqString('Nama'), email, password, phoneNumber });
const loginSchema = z.object({
  email: z.string({ error: 'Email wajib diisi' }).trim().min(1, 'Email wajib diisi'),
  password: z.string({ error: 'Password wajib diisi' }).min(1, 'Password wajib diisi'),
});

/* ---------- booking ---------- */
const createBookingSchema = z.object({
  roomId: objectId('roomId'),
  startDate: dateString('startDate'),
  endDate: dateString('endDate'),
});
const myBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES, { error: `Status harus salah satu dari: ${BOOKING_STATUSES.join(', ')}` }).optional(),
});
const updateStatusSchema = z.object({
  status: z.enum(BOOKING_STATUSES, { error: `Status tidak valid. Gunakan salah satu dari: ${BOOKING_STATUSES.join(', ')}` }),
});

/* ---------- rooms (public search) ---------- */
const roomSearchQuerySchema = z
  .object({
    hotelId: objectId('hotelId').optional(),
    search: z.string().trim().max(50, 'Kata kunci maksimal 50 karakter').optional(),
    minPrice: z.coerce.number({ error: 'minPrice harus berupa angka' }).min(0, 'minPrice tidak boleh negatif').optional(),
    maxPrice: z.coerce.number({ error: 'maxPrice harus berupa angka' }).min(0, 'maxPrice tidak boleh negatif').optional(),
    checkIn: dateString('checkIn').optional(),
    checkOut: dateString('checkOut').optional(),
  })
  .refine((q) => !!q.checkIn === !!q.checkOut, 'checkIn dan checkOut harus diisi bersamaan')
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, 'minPrice tidak boleh lebih besar dari maxPrice');

/* ---------- admin: users ---------- */
const adminCreateUserSchema = z.object({
  name: reqString('Nama'),
  email,
  password,
  phoneNumber,
  role: z.enum(ROLES, { error: `Role harus salah satu dari: ${ROLES.join(', ')}` }).optional(),
});
const adminUpdateUserSchema = z
  .object({
    name: reqString('Nama'),
    email,
    phoneNumber,
    role: z.enum(ROLES, { error: `Role harus salah satu dari: ${ROLES.join(', ')}` }),
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE);

/* ---------- admin: hotels ---------- */
const hotelFields = {
  name: reqString('Nama hotel', 150),
  location: reqString('Lokasi', 200),
  description: z.string().trim().max(2000, 'Deskripsi maksimal 2000 karakter'),
  rating: z.number({ error: 'Rating harus berupa angka' }).min(0, 'Rating minimal 0').max(5, 'Rating maksimal 5'),
};
const createHotelSchema = z.object({ ...hotelFields, description: hotelFields.description.optional(), rating: hotelFields.rating.optional() });
const updateHotelSchema = z.object(hotelFields).partial().refine(atLeastOneField, AT_LEAST_ONE);

/* ---------- admin: rooms ---------- */
const roomFields = {
  hotelId: objectId('hotelId'),
  roomType: reqString('Tipe kamar', 100),
  pricePerNight: z.number({ error: 'Harga per malam harus berupa angka' }).min(0, 'Harga per malam tidak boleh negatif'),
  isAvailable: z.boolean({ error: 'isAvailable harus true atau false' }),
};
const createRoomSchema = z.object({ ...roomFields, isAvailable: roomFields.isAvailable.optional() });
const updateRoomSchema = z.object(roomFields).partial().refine(atLeastOneField, AT_LEAST_ONE);

module.exports = {
  registerSchema, loginSchema,
  createBookingSchema, myBookingsQuerySchema, updateStatusSchema,
  roomSearchQuerySchema,
  adminCreateUserSchema, adminUpdateUserSchema,
  createHotelSchema, updateHotelSchema,
  createRoomSchema, updateRoomSchema,
};
