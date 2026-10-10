const ApiError = require('../utils/ApiError');

/**
 * validate(schema, source)
 * Middleware validasi input berbasis Zod.
 *  - source: 'body' (default) | 'query' | 'params'
 *  - Untuk 'body', hasil parse (field tak dikenal dibuang & string di-trim) menggantikan req.body,
 *    sehingga controller hanya menerima data yang sudah bersih.
 *  - Jika gagal -> ApiError 400 dengan pesan yang merangkum semua aturan yang dilanggar.
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});

  if (!result.success) {
    const messages = [...new Set(result.error.issues.map((i) => i.message))];
    return next(new ApiError(400, messages.join(', ')));
  }

  if (source === 'body') req.body = result.data;
  next();
};

module.exports = validate;
