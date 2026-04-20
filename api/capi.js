const { getSupabase } = require('./_supabase');
const { setCors }     = require('./_auth');
const crypto          = require('crypto');

function hashSHA256(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { lead_id, event_name } = req.body || {};
    const supabase = getSupabase();

    const { data: lead, error: leadError } = await supabase
      .from('leads').select('*').eq('id', lead_id).single();

    if (leadError || !lead) return res.status(404).json({ error: 'Lead not found' });

    const event_id   = event_name === 'Purchase' ? lead.purchase_event_id : lead.event_id;
    const event_time = Math.floor(new Date(
      event_name === 'Purchase' && lead.deposito_fecha ? lead.deposito_fecha : lead.created_at
    ).getTime() / 1000);

    const eventData = {
      event_name,
      event_time,
      event_id,
      event_source_url: lead.event_source_url || ('https://' + process.env.APP_DOMAIN),
      action_source:    'website',
      user_data: {
        client_ip_address: lead.ip         || undefined,
        client_user_agent: lead.user_agent || undefined,
        fbc: lead.fbc       || undefined,
        fbp: lead.fbp       || undefined,
        em:  lead.email     ? [hashSHA256(lead.email)]    : undefined,
        ph:  lead.telefono  ? [hashSHA256(lead.telefono)] : undefined,
      },
    };

    if (event_name === 'Purchase') {
      eventData.custom_data = {
        value:    parseFloat(lead.deposito_monto),
        currency: lead.deposito_moneda || 'ARS',
      };
    }

    const payload = { data: [eventData] };
    if (process.env.META_TEST_CODE) payload.test_event_code = process.env.META_TEST_CODE;

    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const metaData = await metaRes.json();
    const success  = !!metaData.events_received;

    await supabase.from('capi_log').insert({
      lead_id: lead.id, event_name, event_id, payload, response: metaData, success
    });

    if (event_name === 'Purchase' && success) {
      await supabase.from('leads').update({ purchase_enviado: true }).eq('id', lead.id);
    }

    return res.status(200).json({ ok: true, success, meta: metaData });
  } catch (err) {
    console.error('capi error:', err);
    return res.status(500).json({ error: err.message });
  }
};
