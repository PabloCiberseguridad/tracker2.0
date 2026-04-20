# Meta Tracker v3 — Vercel + Supabase Free

## Estructura

```
tracker/
├── api/
│   ├── _supabase.js        ← cliente Supabase compartido
│   ├── _auth.js            ← helpers de auth y CORS
│   ├── auth.js             ← POST /api/auth
│   ├── receive.js          ← POST /api/receive  (lead entry)
│   ├── visit.js            ← POST /api/visit    (pageview)
│   ├── capi.js             ← POST /api/capi     (Meta CAPI)
│   ├── leads.js            ← GET  /api/leads    (panel)
│   ├── leads/
│   │   └── update.js       ← POST /api/leads/update
│   ├── purchase.js         ← POST /api/purchase
│   ├── campanas.js         ← GET  /api/campanas (resumen)
│   └── visitas.js          ← GET  /api/visitas
├── public/
│   ├── tracker.js          ← script del cliente
│   ├── index.html          ← tu landing
│   └── panel.html          ← panel de administración
├── supabase/
│   └── schema.sql          ← ejecutar en Supabase SQL Editor
├── .env.example
├── package.json
└── vercel.json
```

---

## 1. Supabase — crear las tablas

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo (free tier OK).
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/schema.sql`.
3. Ir a **Settings > API** y copiar:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_KEY`

> ⚠️ Usá siempre la `service_role` key **solo en el backend** (variables de entorno de Vercel). Nunca la expongas al cliente.

---

## 2. Vercel — deploy

### Opción A: desde GitHub (recomendada)
1. Subí este repo a GitHub.
2. En [vercel.com](https://vercel.com), **Add New Project** → importar el repo.
3. Vercel detecta el `vercel.json` automáticamente.

### Opción B: desde CLI
```bash
npm i -g vercel
vercel
```

### Variables de entorno
En el dashboard de Vercel → **Settings > Environment Variables**, cargá todas las variables de `.env.example`:

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key de Supabase |
| `PANEL_SECRET` | Contraseña del panel (elegila vos) |
| `META_PIXEL_ID` | ID del Pixel de Meta |
| `META_CAPI_TOKEN` | Token de la API de Conversiones |
| `META_TEST_CODE` | (Opcional) código de prueba CAPI |
| `APP_URL` | URL completa de tu app en Vercel |
| `APP_DOMAIN` | Dominio sin https:// |

---

## 3. Configurar tracker.js en tu landing

En `public/tracker.js`, editá las dos variables al principio:

```js
var META_PIXEL_ID   = "TU_PIXEL_ID";
var WHATSAPP_NUMBER = "5493562547636";  // con código de país, sin +
```

En tu `index.html`, incluí el script:

```html
<script src="/tracker.js"></script>
```

Y asegurate de que el botón de WhatsApp tenga `id="btn-wpp"`:

```html
<a id="btn-wpp" href="#">Hablar con un asesor</a>
```

---

## 4. Panel de administración

Accedé a `https://tu-proyecto.vercel.app/panel.html`.

El panel muestra:
- **Campañas**: resumen por `utm_campaign` con visitas, leads, depósitos y tasas de conversión.
- **Leads**: tabla completa con estado, notas y botón para registrar depósito.
- **Visitas**: log de pageviews.

---

## Límites del plan free

| Servicio | Límite free | Impacto |
|---|---|---|
| Vercel Functions | 100 GB-hours / mes | Suficiente para miles de requests |
| Vercel Bandwidth | 100 GB / mes | — |
| Supabase DB | 500 MB | ~millones de filas |
| Supabase Bandwidth | 5 GB / mes | — |
| Supabase API requests | Ilimitadas | ✅ |

> La única limitación real: **no hay funciones SQL** en Supabase free.  
> El resumen de campañas se calcula en el backend (`/api/campanas`) y en el panel, sin necesidad de ninguna función PostgreSQL.

---

## Flujo de datos

```
Visitante llega a la landing
        │
        ▼
tracker.js → POST /api/visit        (registra pageview)
        │
        ▼ (click en botón WPP)
tracker.js → POST /api/receive      (guarda lead en Supabase)
        │                                     │
        │                                     ▼
        │                           POST /api/capi → Meta CAPI (Lead)
        ▼
Redirige a WhatsApp

Panel → POST /api/purchase          (registra depósito)
        │
        ▼
        POST /api/capi → Meta CAPI (Purchase)
```
