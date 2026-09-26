# 🏨 Hotel Booking Backend API

RESTful API backend untuk sistem booking hotel, dibangun dengan Node.js, Express,
MongoDB (Mongoose), JWT Authentication, notifikasi WhatsApp (Fonnte), invoice PDF
(pdfkit), dan dokumentasi Swagger.

## 📁 Struktur Folder (MVC)

```
hotel-booking-backend/
├── config/
│   ├── db.js               # Koneksi ke MongoDB
│   └── swagger.js          # Konfigurasi Swagger (OpenAPI)
├── controllers/
│   ├── authController.js
│   ├── roomController.js
│   ├── bookingController.js
│   ├── adminUserController.js
│   ├── adminHotelController.js
│   ├── adminRoomController.js
│   └── adminBookingController.js
├── middlewares/
│   ├── authMiddleware.js   # protect (JWT) & adminOnly (RBAC)
│   └── errorHandler.js     # notFound & centralized error handler
├── models/
│   ├── User.js
│   ├── Hotel.js
│   ├── Room.js
│   └── Booking.js
├── routes/
│   ├── authRoutes.js
│   ├── roomRoutes.js
│   ├── bookingRoutes.js
│   └── adminRoutes.js
├── utils/
│   ├── ApiError.js         # Custom error class
│   ├── generateBookingId.js
│   ├── sendWhatsApp.js     # Integrasi Fonnte
│   ├── generateInvoice.js  # Generate PDF via pdfkit
│   └── seed.js             # Script seeding data dummy
├── invoices/                # Direktori penyimpanan file PDF invoice (auto-generated)
├── .env.example
├── package.json
└── server.js                # Entry point aplikasi
```

## 🚀 Langkah Instalasi & Menjalankan Proyek

### 1. Install dependencies

```bash
npm install
```

Ini akan menginstall seluruh package berikut:
`express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `axios`, `pdfkit`,
`swagger-jsdoc`, `swagger-ui-express`, dan `nodemon` (devDependency).

### 2. Konfigurasi Environment Variable

Salin file `.env.example` menjadi `.env`, lalu sesuaikan nilainya:

```bash
cp .env.example .env
```

Isi variabel berikut di `.env`:

| Variabel        | Keterangan                                                       |
|-----------------|-------------------------------------------------------------------|
| `PORT`          | Port server (default: 5000)                                       |
| `BASE_URL`      | URL dasar server, dipakai untuk link download invoice & Swagger  |
| `MONGO_URI`     | Connection string MongoDB (lokal atau MongoDB Atlas)              |
| `JWT_SECRET`    | Secret key untuk signing token JWT (gunakan string acak yang kuat)|
| `JWT_EXPIRES_IN`| Masa berlaku token, contoh: `7d`                                   |
| `FONNTE_TOKEN`  | Token API dari [fonnte.com](https://fonnte.com) untuk kirim WA    |

### 3. Pastikan MongoDB berjalan

Jalankan MongoDB secara lokal, atau gunakan MongoDB Atlas dan masukkan connection
string-nya ke `MONGO_URI`.

### 4. Jalankan seeding data dummy (opsional tapi disarankan)

```bash
npm run seed
```

Script ini akan membuat:
- 1 akun **Admin**: `admin@hotelbooking.com` / `admin123`
- 1 akun **User**: `budi@example.com` / `user123`
- 2 Hotel dan 5 Room contoh

### 5. Jalankan server

```bash
# mode development (auto-restart dengan nodemon)
npm run dev

# atau mode production
npm start
```

Server berjalan di `http://localhost:5000` (atau sesuai `PORT` di `.env`).

### 6. Akses Dokumentasi API (Swagger)

Buka browser ke:

```
http://localhost:5000/api-docs
```

Semua endpoint (Auth, Rooms, Bookings, Admin) terdokumentasi dan bisa langsung
dicoba (Try it out) dari sana. Untuk endpoint yang butuh login, klik tombol
**Authorize** lalu masukkan `Bearer <token_JWT_hasil_login>`.

## 🔑 Alur Penggunaan Singkat

1. `POST /api/auth/register` atau login dengan akun hasil seeding di `/api/auth/login` → dapatkan token JWT.
2. `GET /api/rooms` → lihat daftar kamar yang tersedia.
3. `POST /api/bookings` (butuh token) → booking kamar, status awal `Pending`, notifikasi WA otomatis terkirim.
4. Login sebagai **Admin** → `PUT /api/admin/bookings/:id/status` untuk mengonfirmasi/menolak booking (notifikasi WA otomatis terkirim ke user).
5. `GET /api/bookings/:id/invoice` (sebagai User pemilik booking) → download invoice PDF, link juga dikirim via WA.
6. User bisa membatalkan booking miliknya sendiri lewat `POST /api/bookings/:id/cancel`.

## ⚠️ Catatan Penting

- Field `phoneNumber` ditambahkan pada model `User` (di luar spesifikasi awal secara eksplisit) karena notifikasi WhatsApp via Fonnte membutuhkan nomor tujuan yang valid.
- Pengiriman notifikasi WA didesain **best-effort**: jika gagal (misal token Fonnte salah / device offline), proses utama (booking / update status) tetap berhasil, kegagalan hanya di-log ke console — agar sistem tidak down hanya karena pihak ketiga error.
- File invoice PDF disimpan secara fisik di folder `/invoices` dan bisa diakses publik lewat `{BASE_URL}/invoices/<namafile>.pdf` (dipakai di link WA).
