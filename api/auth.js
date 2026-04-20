const { setCors } = require('./_auth');

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { password } = req.body || {};
  if (password && password === process.env.PANEL_SECRET) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false });
};
