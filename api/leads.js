const { getSupabase }          = require('./_supabase');
const { requireAuth, setCors } = require('./_auth');

module.exports = async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res))   return;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ leads: data });
};
