// ── Configuración ──────────────────────────────────────────
var META_PIXEL_ID    = "2897525123911731";       // reemplazá con tu Pixel ID
var WHATSAPP_NUMBER  = "5493562547636";     // ej: 5493562547636
var RECEIVE_ENDPOINT = "/api/receive";
var VISIT_ENDPOINT   = "/api/visit";
// ────────────────────────────────────────────────────────────

function generateClickId() {
  return "click_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
}
var click_id = generateClickId();
try { localStorage.setItem("click_id", click_id); } catch(e) {}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || "";
}
function getCookie(name) {
  var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : "";
}
function setCookie(name, value, maxAgeSeconds) {
  document.cookie = name + "=" + value + "; path=/; max-age=" + maxAgeSeconds;
}

function ensureFbc() {
  var existing = getCookie("_fbc");
  if (existing) return existing;
  var fbclid = getQueryParam("fbclid");
  if (!fbclid) return "";
  var fbc = "fb.1." + Date.now() + "." + fbclid;
  setCookie("_fbc", fbc, 60 * 60 * 24 * 90);
  return fbc;
}

function loadMetaPixel() {
  if (window.fbq) return;
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;
    n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  }(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");
}

function buildWhatsAppLink() {
  var params  = new URLSearchParams(window.location.search);
  var text    = encodeURIComponent("Hola, quiero el bono VIP");
  var tracked = ["utm_campaign","utm_term","utm_content","utm_source","utm_medium","fbclid","gclid"];
  var out     = new URLSearchParams();
  tracked.forEach(function(k) { var v = params.get(k); if (v) out.set(k, v); });
  var base = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + text;
  return out.toString() ? base + "&" + out.toString() : base;
}

function buildLeadPayload() {
  return {
    click_id:         click_id,
    event_id:         "lead_" + Date.now(),
    landing_name:     document.title || "Ultra Landing",
    source_platform:  "whatsapp_cta",
    utm_campaign:     getQueryParam("utm_campaign"),
    utm_term:         getQueryParam("utm_term"),
    utm_content:      getQueryParam("utm_content"),
    utm_source:       getQueryParam("utm_source"),
    utm_medium:       getQueryParam("utm_medium"),
    fbclid:           getQueryParam("fbclid"),
    fbc:              ensureFbc(),
    fbp:              getCookie("_fbp"),
    event_source_url: window.location.href,
  };
}

function sendLead(payload) {
  var json = JSON.stringify(payload);
  try {
    var blob = new Blob([json], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon(RECEIVE_ENDPOINT, blob)) return;
  } catch(e) {}
  fetch(RECEIVE_ENDPOINT, {
    method:    "POST",
    headers:   { "Content-Type": "application/json" },
    body:      json,
    keepalive: true,
  }).catch(function() {});
}

function sendVisit() {
  fetch(VISIT_ENDPOINT, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ landing: "ultra-landing" }),
  }).catch(function() {});
}

var locked = false;
function handleClick(e) {
  e.preventDefault();
  if (locked) return;
  locked = true;
  var btn    = document.getElementById("btn-wpp");
  var helper = document.getElementById("helper-text");
  if (btn)    btn.classList.add("is-loading");
  if (helper) helper.textContent = "Conectando con un asesor...";
  var payload = buildLeadPayload();
  var url     = buildWhatsAppLink();
  if (window.fbq) fbq("track", "Lead", {}, { eventID: payload.event_id });
  sendLead(payload);
  window.location.href = url;
}

function init() {
  loadMetaPixel();
  sendVisit();
  var btn = document.getElementById("btn-wpp");
  if (btn) btn.addEventListener("click", handleClick);
}

document.addEventListener("DOMContentLoaded", init);
