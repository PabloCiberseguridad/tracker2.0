const { getSupabase }          = require('./_supabase');
const { requireAuth, setCors } = require('./_auth');

module.exports = async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res))   return;

  const supabase = getSupabase();

  // Traer todos los leads (campos mínimos para el resumen)
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('utm_campaign, estado, deposito_monto, deposito_moneda, created_at');

  if (leadsError) return res.status(500).json({ error: leadsError.message });

  // Traer conteo de visitas por landing (agrupamos en JS ya que no hay funciones SQL)
  const { data: visitas, error: visitasError } = await supabase
    .from('visitas')
    .select('created_at');

  if (visitasError) return res.status(500).json({ error: visitasError.message });

  // Agrupar leads por utm_campaign
  const campanas = {};

  for (const lead of leads) {
    const camp = lead.utm_campaign || '(sin campaña)';
    if (!campanas[camp]) {
      campanas[camp] = {
        utm_campaign:       camp,
        leads_total:        0,
        depositos_cantidad: 0,
        depositos_monto:    0,
      };
    }
    campanas[camp].leads_total++;
    if (lead.estado === 'deposito' && lead.deposito_monto) {
      campanas[camp].depositos_cantidad++;
      campanas[camp].depositos_monto += parseFloat(lead.deposito_monto) || 0;
    }
  }

  // Visitas totales (sin utm disponible en tabla visitas, las asignamos al total)
  const visitas_total = visitas?.length || 0;

  // Calcular conversiones y armar rows
  const rows = Object.values(campanas).map(c => ({
    utm_campaign:           c.utm_campaign,
    visitas_total,          // mismo valor para todas las campañas (tabla visitas no tiene utm)
    leads_total:            c.leads_total,
    depositos_cantidad:     c.depositos_cantidad,
    depositos_monto:        parseFloat(c.depositos_monto.toFixed(2)),
    conv_visitas_leads:     visitas_total > 0
                              ? parseFloat(((c.leads_total / visitas_total) * 100).toFixed(1))
                              : 0,
    conv_leads_depositos:   c.leads_total > 0
                              ? parseFloat(((c.depositos_cantidad / c.leads_total) * 100).toFixed(1))
                              : 0,
  }));

  // Ordenar por leads desc
  rows.sort((a, b) => b.leads_total - a.leads_total);

  return res.status(200).json({ rows });
};
