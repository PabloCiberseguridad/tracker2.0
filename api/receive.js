const { getSupabase } = require('./_supabase');
const { setCors }     = require('./_auth');

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body     = req.body;
    const supabase = getSupabase();

    const lead = {
      click_id:         body.click_id,
      event_id:         body.event_id,
      fbclid:           body.fbclid           || null,
      fbc:              body.fbc               || null,
      fbp:              body.fbp               || null,
      utm_source:       body.utm_source        || null,
      utm_medium:       body.utm_medium        || null,
      utm_campaign:     body.utm_campaign      || null,
      utm_term:         body.utm_term          || null,
      utm_content:      body.utm_content       || null,
      ip:               req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null,
      user_agent:       req.headers['user-agent'] || null,
      landing_name:     body.landing_name      || 'ultra-landing',
      event_source_url: body.event_source_url  || null,
      source_platform:  body.source_platform   || 'whatsapp_cta',
      estado:           'nuevo',
    };

    const { data, error } = await supabase
      .from('leads')
      .upsert(lead, { onConflict: 'click_id', ignoreDuplicates: true })
      .select()
      .single();

    if (error) throw error;

    // Disparar CAPI Lead en background (sin bloquear la respuesta)
    if (data) {
      fetch(`${process.env.APP_URL}/api/capi`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ lead_id: data.id, event_name: 'Lead' }),
      }).catch(() => {});
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('receive error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
