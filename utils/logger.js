/**
 * utils/logger.js
 * Logger terstruktur (1 baris JSON per log) tanpa dependensi tambahan.
 * Contoh output:
 *   {"time":"2026-10-09T08:00:00.000Z","level":"error","message":"Gagal kirim WA","context":{"error":"timeout"}}
 *
 * Field sensitif (password, token, authorization, dst.) otomatis disensor ke "[REDACTED]"
 * sehingga tidak bocor ke log walaupun tidak sengaja ikut dikirim sebagai context.
 */
const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'jwt', 'secret', 'fonnte_token'];

const redact = (value, depth = 0) => {
  if (value === null || typeof value !== 'object' || depth > 4) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))
      ? '[REDACTED]'
      : redact(val, depth + 1);
  }
  return out;
};

const write = (level, message, context) => {
  if (process.env.NODE_ENV === 'test') return; // jangan menuh-menuhi output test
  const entry = { time: new Date().toISOString(), level, message };
  if (context !== undefined) entry.context = redact(context);
  const line = JSON.stringify(entry);
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
};

/** Menyamarkan nomor telepon di log: 6285213818167 -> ********8167 */
const maskPhone = (phone = '') => String(phone).replace(/\d(?=\d{4})/g, '*');

module.exports = {
  info: (msg, ctx) => write('info', msg, ctx),
  warn: (msg, ctx) => write('warn', msg, ctx),
  error: (msg, ctx) => write('error', msg, ctx),
  redact,
  maskPhone,
};
