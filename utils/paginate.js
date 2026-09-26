/**
 * getPagination
 * Mem-parsing query ?page= & ?limit= dengan fallback aman.
 * limit dibatasi maksimal 100 agar response tidak terlalu berat.
 */
const getPagination = (query = {}) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * buildPaginationMeta
 * Menyusun metadata pagination yang konsisten untuk setiap response list.
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.max(Math.ceil(total / limit), 1),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

module.exports = { getPagination, buildPaginationMeta };
