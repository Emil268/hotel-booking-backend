const jwt = require('jsonwebtoken');

const signToken = (id = '6abf101b575b8fc9ddb12bb0', role = 'User') =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

/** YYYY-MM-DD, N hari dari hari ini (untuk tanggal booking yang selalu valid/di masa depan) */
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

module.exports = { signToken, daysFromNow };
