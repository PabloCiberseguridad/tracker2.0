const { getSupabase }          = require('../_supabase');
const { requireAuth, setCors } = require('../_auth');

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res))   return;

  const { lead_id, estado, notas } = req.body || {};
  if (!lead_id) return res.status(400).json({ error: 'lead_id requerido' });

  const supabase = getSupabase();

  const updates = {};
  if (estado !== undefined) updates.estado = estado;
  if (notas  !== undefined) updates.notas  = notas;

  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', lead_id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
};
