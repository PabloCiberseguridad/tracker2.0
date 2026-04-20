const { getSupabase } = require('./_supabase');
const { setCors }     = require('./_auth');

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  try {
    const supabase = getSupabase();
    await supabase.from('visitas').insert({
      landing:    req.body?.landing || 'ultra-landing',
      ip:         req.headers['x-forwarded-for']?.split(',')[0] || null,
      user_agent: req.headers['user-agent'] || null,
      referrer:   req.headers['referer'] || null,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('visit error:', err);
    return res.status(200).json({ ok: false });
  }
};
