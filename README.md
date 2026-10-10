# Hotel Booking Backend API

REST API backend untuk sistem pemesanan kamar hotel: **Node.js, Express, MongoDB (Mongoose), JWT**,
notifikasi WhatsApp (**Fonnte**), invoice PDF (**PDFKit**), dan dokumentasi interaktif (**Swagger**).

## Fitur

- Autentikasi JWT dengan 2 role: **User** & **Admin** (registrasi publik selalu menghasilkan `User`)
- Pencarian kamar (filter hotel, harga, kata kunci, dan **ketersediaan per tanggal** `checkIn`/`checkOut`) + pagination
- Pemesanan kamar dengan pengecekan bentrok jadwal yang aman terhadap request bersamaan
- Riwayat booking milik sendiri, pembatalan booking, dan status booking dengan aturan transisi (state machine)
- Notifikasi WhatsApp otomatis (booking dibuat, dibatalkan, status diubah, link invoice)
- Invoice PDF dengan akses terbatas (login pemilik booking, atau link bertoken singkat dari WhatsApp)
- Admin: CRUD user, hotel, kamar, dan kelola seluruh booking
- Keamanan: Helmet, CORS whitelist, rate limiting, batas ukuran body, validasi input (Zod), anti mass-assignment
- Health check `GET /health`, logging terstruktur (JSON), dan pengujian otomatis (Jest + Supertest)

## Struktur Folder

```
hotel-booking-backend/
├── app.js                  # Merakit aplikasi Express (middleware + routes), diekspor untuk testing
├── server.js               # Entry point: validasi .env, konek database, menyalakan server
├── addrooms.js             # Menambah 1 hotel + 1 kamar contoh (idempoten): npm run add-room
├── config/
│   ├── db.js               # Koneksi MongoDB
│   ├── env.js              # Validasi environment variable (fail-fast)
│   └── swagger.js          # Konfigurasi Swagger (OpenAPI)
├── controllers/            # Logika tiap fitur (auth, room, booking, invoice, admin*)
├── middlewares/
│   ├── authMiddleware.js   # protect (JWT) & adminOnly (RBAC)
│   ├── validate.js         # Validasi input berbasis Zod
│   ├── rateLimiters.js     # Rate limiting (umum & khusus login/registrasi)
│   ├── requestLogger.js    # Log request terstruktur
│   └── errorHandler.js     # Penanganan error terpusat
├── models/                 # User, Hotel, Room, Booking (Mongoose)
├── routes/                 # auth, rooms, bookings, admin, invoices, health
├── validators/schemas.js   # Skema validasi (Zod) untuk seluruh endpoint
├── utils/
│   ├── constants.js        # Konstanta bersama (mis. panjang minimal password)
│   ├── dateRange.js        # Aturan tanggal menginap (dipakai booking & pencarian kamar)
│   ├── generateInvoice.js  # Membuat PDF invoice (PDFKit)
│   ├── invoiceFile.js      # Memakai ulang PDF invoice selama data booking belum berubah
│   ├── invoiceToken.js     # Token JWT singkat untuk link invoice WhatsApp
│   ├── logger.js           # Logger terstruktur + penyensoran data sensitif
│   ├── notify.js           # Kirim WhatsApp "aman" (tidak pernah menggagalkan transaksi)
│   ├── sendWhatsApp.js     # Integrasi Fonnte
│   ├── paginate.js, ApiError.js, generateBookingId.js
│   ├── seed.js             # Data awal (menghapus data lama, ditolak di production)
│   └── migrateTotalPrice.js# Migrasi sekali jalan: totalPrize -> totalPrice
├── invoices/               # Penyimpanan PDF (TIDAK di-serve sebagai file statis)
└── tests/                  # Pengujian otomatis (Jest + Supertest)
```

## Menjalankan Proyek

```bash
git clone https://github.com/Emil268/hotel-booking-backend.git
cd hotel-booking-backend
npm install
cp .env.example .env      # Windows: copy .env.example .env, lalu isi nilainya
npm run dev               # development (nodemon)   |   npm start  # production
```

Swagger UI: `http://localhost:5000/api-docs` &nbsp;·&nbsp; Health check: `http://localhost:5000/health`

**Wajib di `.env`:** `MONGO_URI` dan `JWT_SECRET`. Server menolak start jika salah satunya kosong. Di production,
`JWT_SECRET` harus minimal 32 karakter dan bukan nilai contoh. Daftar lengkap variabel ada di `.env.example`.

| Script | Fungsi |
|---|---|
| `npm run dev` / `npm start` | Menjalankan server |
| `npm test` | Menjalankan seluruh pengujian otomatis |
| `npm run seed` | Mengisi data awal (**menghapus** data lama; ditolak jika `NODE_ENV=production`) |
| `npm run add-room` | Menambah 1 hotel + 1 kamar contoh tanpa menghapus data (idempoten) |
| `npm run migrate:price` | Mengganti nama field lama `totalPrize` menjadi `totalPrice` pada data yang sudah ada |

Akun dari `npm run seed`: `admin@hotelbooking.com` / `admin123` (Admin), `budi@example.com` / `user12345` (User).
Ganti segera jika dipakai di luar development.

## Ringkasan Endpoint

Base URL `http://localhost:5000`. Endpoint bertanda 🔒 butuh header `Authorization: Bearer <token>`.

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/health` | Publik | Status aplikasi & database |
| POST | `/api/auth/register` | Publik | Registrasi (role selalu `User`) |
| POST | `/api/auth/login` | Publik | Login, mengembalikan token JWT |
| GET | `/api/rooms` | Publik | Cari kamar: `hotelId`, `search`, `minPrice`, `maxPrice`, `checkIn`+`checkOut`, `page`, `limit` |
| POST | `/api/bookings` | 🔒 User | Buat booking (`roomId`, `startDate`, `endDate`) |
| GET | `/api/bookings` | 🔒 User | Riwayat booking sendiri (`status`, `page`, `limit`) |
| **PATCH** | `/api/bookings/:id/cancel` | 🔒 Pemilik | Batalkan booking |
| GET | `/api/bookings/:id/invoice` | 🔒 Pemilik | Unduh invoice PDF; link WA dikirim maks. 1x per jam |
| GET | `/api/invoices/:token` | Token invoice | Unduh invoice lewat link WhatsApp (berlaku 1 jam) |
| GET/POST | `/api/admin/users` | 🔒 Admin | Daftar / buat user |
| GET/PUT/DELETE | `/api/admin/users/:id` | 🔒 Admin | Detail / ubah / hapus user |
| GET/POST | `/api/admin/hotels` | 🔒 Admin | Daftar / tambah hotel |
| GET/PUT/DELETE | `/api/admin/hotels/:id` | 🔒 Admin | Detail / ubah / hapus hotel |
| GET/POST | `/api/admin/rooms` | 🔒 Admin | Daftar / tambah kamar |
| GET/PUT/DELETE | `/api/admin/rooms/:id` | 🔒 Admin | Detail / ubah / hapus kamar |
| GET | `/api/admin/bookings` | 🔒 Admin | Semua booking (filter `status`) |
| PUT | `/api/admin/bookings/:id/status` | 🔒 Admin | Ubah status booking (+ notifikasi WA) |

Semua endpoint list mendukung pagination `?page=1&limit=10` (maksimal `limit` 100).

## Aturan Bisnis

- **Tanggal menginap:** check-out harus setelah check-in; check-in tidak boleh di masa lalu. Jumlah malam dibulatkan ke atas
  (minimal 1 malam). Aturan ini satu sumber (`utils/dateRange.js`) untuk pembuatan booking dan pencarian kamar.
- **Bentrok jadwal:** booking berstatus `Pending`/`Dikonfirmasi` memegang kamar. Booking ditolak dengan `409` jika rentang tanggalnya
  overlap dengan booking aktif lain pada kamar yang sama. Untuk request bersamaan, booking disimpan lalu diverifikasi ulang; jika
  ada pemenang lain, booking sendiri dibatalkan otomatis (tanpa butuh replica set MongoDB). Pada tabrakan yang benar-benar
  serentak kedua request bisa sama-sama ditolak (`409`) — aman, cukup coba lagi.
- **Status booking:** `Pending` → `Dikonfirmasi` / `Ditolak` / `Cancelled`; `Dikonfirmasi` → `Cancelled`; `Ditolak` dan `Cancelled` bersifat final.
- **Invoice:** folder `invoices/` tidak pernah di-serve langsung. PDF dibuat ulang hanya jika data booking berubah. Link WhatsApp memakai
  token JWT khusus (hanya untuk 1 booking, berlaku 1 jam).
- **Notifikasi WhatsApp:** best-effort. Gagalnya Fonnte tidak menggagalkan booking/ubah status; kegagalan dicatat di log.
- **Password:** minimal 8 karakter, aturan yang sama di validator, controller, dan model.

## Keamanan

Helmet (header keamanan), CORS dengan whitelist `CORS_ORIGINS`, rate limiting (login/registrasi lebih ketat), batas body 10 KB,
validasi seluruh input dengan Zod, whitelist field pada update hotel/kamar (anti mass-assignment), pencarian teks di-escape
(anti regex injection), dan log yang menyensor password/token serta menyamarkan nomor telepon.

## Pengujian

```bash
npm test
```

Memakai Jest + Supertest dengan model database di-mock, jadi tidak membutuhkan MongoDB. Cakupan: validasi env, autentikasi & role,
validasi input, anti double-booking (termasuk skenario bersamaan), ketersediaan per tanggal, transisi status, CORS, rate limiting,
dan health check.

## Catatan & Keterbatasan

- Belum ada refresh token / logout sisi-server (token JWT stateless berlaku sesuai `JWT_EXPIRES_IN`).
- Belum ada antrean pekerjaan (queue) untuk WhatsApp; pengiriman dilakukan di proses yang sama secara best-effort.
- Rate limiter memakai memori proses (cukup untuk 1 instance; gunakan store Redis jika di-scale ke banyak instance).
