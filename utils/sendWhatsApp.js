const axios = require('axios');

const FONNTE_API_URL = 'https://api.fonnte.com/send';

/**
 * sendWhatsAppNotification
 * Mengirim pesan notifikasi WhatsApp ke nomor tujuan menggunakan API Fonnte.
 *
 * PENTING: Fungsi ini didesain "best-effort" (tidak melempar error ke pemanggil).
 * Jika pengiriman WA gagal (misal token invalid, device offline, dsb), proses
 * utama (booking / update status) TETAP LANJUT dan tidak boleh gagal hanya
 * karena notifikasi WA gagal terkirim. Kegagalan hanya akan di-log ke console.
 *
 * @param {string} target - Nomor tujuan WhatsApp, format: 62812xxxxxxx (tanpa '+' atau spasi)
 * @param {string} message - Isi pesan yang akan dikirim
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
const sendWhatsAppNotification = async (target, message) => {
  try {
    if (!process.env.FONNTE_TOKEN) {
      console.warn('⚠️  FONNTE_TOKEN belum diset di .env, notifikasi WA dilewati.');
      return { success: false, error: 'FONNTE_TOKEN tidak ditemukan' };
    }

    // Normalisasi nomor: hilangkan karakter selain digit, dan ganti awalan 0 -> 62
    let normalizedTarget = target.replace(/\D/g, '');
    if (normalizedTarget.startsWith('0')) {
      normalizedTarget = `62${normalizedTarget.slice(1)}`;
    }

    const response = await axios.post(
      FONNTE_API_URL,
      {
        target: normalizedTarget,
        message,
        countryCode: '62',
      },
      {
        headers: {
          Authorization: process.env.FONNTE_TOKEN,
        },
        timeout: 10000, // 10 detik, agar tidak menggantung jika Fonnte lambat merespons
      }
    );

    console.log(`📲 Notifikasi WA terkirim ke ${normalizedTarget}`);
    return { success: true, data: response.data };
  } catch (error) {
    // Cukup log error, jangan sampai mengganggu flow utama aplikasi
    console.error(`❌ Gagal mengirim notifikasi WA: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = sendWhatsAppNotification;
