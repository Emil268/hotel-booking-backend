const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const INVOICE_DIR = path.join(__dirname, '..', 'invoices');

if (!fs.existsSync(INVOICE_DIR)) {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

/**
 * generateInvoicePDF
 * Membuat file invoice PDF untuk sebuah booking dengan informasi lengkap.
 */
const generateInvoicePDF = (booking) => {
  return new Promise((resolve, reject) => {
    try {
      const user = booking.userId;
      const room = booking.roomId;
      const hotel = room.hotelId;

      const fileName = `invoice-${booking.bookingId}.pdf`;
      const filePath = path.join(INVOICE_DIR, fileName);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Kalkulasi Batas Waktu Pembayaran (24 Jam setelah booking dibuat)
      const createdAt = new Date(booking.createdAt || Date.now());
      const paymentDeadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      const formattedDeadline = paymentDeadline.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      // ===== HEADER =====
      doc
        .fontSize(20)
        .fillColor('#2c3e50')
        .text('INVOICE BOOKING HOTEL', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor('#7f8c8d')
        .text('Dokumen ini adalah bukti pemesanan kamar hotel yang sah', { align: 'center' })
        .moveDown(1.5);

      doc.strokeColor('#bdc3c7').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ===== INFORMASI BOOKING =====
      doc.fontSize(12).fillColor('#000000');
      doc.font('Helvetica-Bold').text('Booking ID: ', { continued: true }).font('Helvetica').text(booking.bookingId);
      doc
        .font('Helvetica-Bold')
        .text('Status: ', { continued: true })
        .font('Helvetica')
        .text(booking.status);
      doc
        .font('Helvetica-Bold')
        .text('Tanggal Dibuat: ', { continued: true })
        .font('Helvetica')
        .text(createdAt.toLocaleString('id-ID'));
      doc.moveDown(1);

      // ===== INFORMASI TAMU =====
      doc.font('Helvetica-Bold').fontSize(13).text('Informasi Tamu');
      doc.font('Helvetica').fontSize(11);
      doc.text(`Nama         : ${user.name}`);
      doc.text(`Email        : ${user.email}`);
      doc.text(`No. WhatsApp : ${user.phoneNumber}`);
      doc.moveDown(1);

      // ===== INFORMASI HOTEL & KAMAR =====
      doc.font('Helvetica-Bold').fontSize(13).text('Detail Hotel & Kamar');
      doc.font('Helvetica').fontSize(11);
      doc.text(`Hotel        : ${hotel.name}`);
      doc.text(`Lokasi       : ${hotel.location}`);
      doc.text(`Tipe Kamar   : ${room.roomType}`);
      doc.text(`Harga/Malam  : Rp ${room.pricePerNight.toLocaleString('id-ID')}`);
      doc.moveDown(1);

      // ===== DETAIL MENGINAP & PEMBAYARAN =====
      doc.font('Helvetica-Bold').fontSize(13).text('Detail Menginap & Pembayaran');
      doc.font('Helvetica').fontSize(11);
      doc.text(`Check-in     : ${new Date(booking.startDate).toLocaleDateString('id-ID')}`);
      doc.text(`Check-out    : ${new Date(booking.endDate).toLocaleDateString('id-ID')}`);
      doc.text(`Total Malam  : ${booking.totalDays} malam`);

      // Catatan: sistem ini belum terintegrasi dengan payment gateway apa pun,
      // sehingga invoice TIDAK menampilkan nomor rekening/metode bayar fiktif.
      // Instruksi pembayaran resmi disampaikan terpisah oleh Admin.
      doc.text('Metode Bayar : Akan diinformasikan oleh Admin setelah booking diverifikasi');
      doc.text(`Batas Bayar  : ${formattedDeadline}`);
      doc.moveDown(1);

      doc.strokeColor('#bdc3c7').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      // ===== TOTAL HARGA =====
      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor('#27ae60')
        .text(`TOTAL PEMBAYARAN: Rp ${booking.totalPrize.toLocaleString('id-ID')}`, { align: 'right' });

      doc.moveDown(2);
      doc
        .fontSize(9)
        .fillColor('#95a5a6')
        .text('Invoice ini digenerate otomatis oleh sistem Hotel Booking API.', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve({ fileName, filePath });
      });
      writeStream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateInvoicePDF;