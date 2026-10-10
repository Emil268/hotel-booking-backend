const logger = require('../utils/logger');

// Token invoice ada di path URL (/api/invoices/<token>) -> jangan pernah ditulis ke log.
const sanitizeUrl = (url) => url.replace(/(\/api\/invoices\/)[^/?]+/, '$1[REDACTED]');

/**
 * requestLogger
 * Mencatat 1 baris log terstruktur per request setelah response selesai:
 * method, path, status, durasi (ms). Level mengikuti status (5xx=error, 4xx=warn).
 * Body & header (password, token, dsb.) TIDAK pernah dicatat.
 */
const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('request', {
      method: req.method,
      path: sanitizeUrl(req.originalUrl),
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });
  next();
};

module.exports = requestLogger;
