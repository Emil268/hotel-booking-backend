const sendWhatsAppNotification = require('./sendWhatsApp');
const logger = require('./logger');

/**
 * notify(phone, messageOrFactory)
 * Mengirim WhatsApp secara "fire-and-forget" dan DIJAMIN tidak pernah melempar error
 * (termasuk error saat menyusun pesan, mis. data hotel null). Dengan begitu transaksi
 * utama (booking/ubah status) tidak pernah gagal gara-gara notifikasi.
 */
const notify = (phone, messageOrFactory) => {
  try {
    const message = typeof messageOrFactory === 'function' ? messageOrFactory() : messageOrFactory;
    Promise.resolve(sendWhatsAppNotification(phone, message)).catch((err) =>
      logger.error('Notifikasi WA gagal diproses', { error: err.message })
    );
  } catch (err) {
    logger.error('Gagal menyusun pesan notifikasi WA', { error: err.message });
  }
};

module.exports = notify;
