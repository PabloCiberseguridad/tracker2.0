const { getSupabase }          = require('./_supabase');
const { requireAuth, setCors } = require('./_auth');

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res))   return;
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { lead_id, monto, moneda = 'ARS', notas } = req.body || {};
  if (!lead_id || !monto || isNaN(parseFloat(monto))) {
    return res.status(400).json({ error: 'lead_id y monto son requeridos' });
  }

  const supabase          = getSupabase();
  const purchase_event_id = 'purchase_' + lead_id + '_' + Date.now();

  const { data: lead, error } = await supabase
    .from('leads')
    .update({
      estado:           'deposito',
      deposito_monto:   parseFloat(monto),
      deposito_moneda:  moneda,
      deposito_fecha:   new Date().toISOString(),
      purchase_event_id,
      notas:            notas || null,
    })
    .eq('id', lead_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  try {
    const capiRes  = await fetch(`${process.env.APP_URL}/api/capi`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lead_id, event_name: 'Purchase' }),
    });
    const capiData = await capiRes.json();
    return res.status(200).json({ ok: true, lead, capi: capiData });
  } catch (e) {
    return res.status(200).json({ ok: true, lead, capi: { error: e.message } });
  }
};
