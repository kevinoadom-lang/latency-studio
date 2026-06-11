// Waitlist capacity counter for Latency.
// Keeps an accurate running count of real signups in a Netlify Blobs store and
// exposes ONLY a rounded percentage — never the raw number — so the homepage can
// render a "filling up" bar without ever revealing the actual size of the list.
//
//   GET  -> { pct, nonce }   // pct 0–100; nonce is a short-lived signed token
//   POST -> { ok }           // increment by 1 (guarded; called after a real signup)
//
// Hardening on the POST (increment) path:
//   1. Honeypot — bodies with a filled _gotcha are dropped.
//   2. Origin/Referer allowlist — off-site callers are dropped.
//   3. Signed nonce — the page must echo a token the server signed with
//      WAITLIST_SECRET (which never leaves the server). Single-use + time-limited,
//      so the endpoint can't be replayed or POST-spammed blind.
//   4. Per-IP rate limit — a single IP can only increment a few times per window.
// Each guard fails *soft* (200 + {ok:false}) so the browser never errors.
//
// Env vars (Netlify → Site config → Environment variables):
//   WAITLIST_SEED            current submission count from the Formspree dashboard
//   WAITLIST_CAP             round size (default 50 — the free-plan limit)
//   WAITLIST_SECRET          server-only signing key (enables nonce enforcement)
//   WAITLIST_RATE_MAX        max increments per IP per window (default 3)
//   WAITLIST_RATE_WINDOW_MS  rate-limit window in ms (default 24h)
//   WAITLIST_ALLOWED_HOSTS   comma list (default uselatency.com,www.uselatency.com)
//   WAITLIST_FLOOR           optional min pct so the bar always looks full-ish

const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

const CAP = Number(process.env.WAITLIST_CAP || 50);
const SEED = Number(process.env.WAITLIST_SEED || 0);
const FLOOR = Number(process.env.WAITLIST_FLOOR || 0);
const SECRET = process.env.WAITLIST_SECRET || "";
const NONCE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — generous so a page left open still counts
const RATE_MAX = Number(process.env.WAITLIST_RATE_MAX || 3);
const RATE_WINDOW_MS = Number(process.env.WAITLIST_RATE_WINDOW_MS || 24 * 60 * 60 * 1000);
const ALLOWED_HOSTS = (process.env.WAITLIST_ALLOWED_HOSTS || "uselatency.com,www.uselatency.com")
  .split(",").map(function (h) { return h.trim().toLowerCase(); }).filter(Boolean);

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const ok = (body) => ({ statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(body) });

function toPct(count) {
  const raw = CAP > 0 ? (count / CAP) * 100 : 0;
  return Math.min(100, Math.max(FLOOR, Math.round(raw)));
}

// ---- signed nonce (HMAC of a timestamp; secret stays on the server) ----
function sign(ts) {
  return crypto.createHmac("sha256", SECRET).update(String(ts)).digest("hex");
}
function makeNonce() {
  if (!SECRET) return "";
  const ts = Date.now();
  return ts + "." + sign(ts);
}
function verifyNonce(nonce) {
  if (!SECRET) return "skip";            // enforcement off until WAITLIST_SECRET is set
  if (!nonce || typeof nonce !== "string") return null;
  const parts = nonce.split(".");
  if (parts.length !== 2) return null;
  const ts = parseInt(parts[0], 10);
  const sig = parts[1];
  if (!Number.isFinite(ts)) return null;
  if (Date.now() - ts > NONCE_TTL_MS || ts > Date.now() + 60000) return null; // expired/future
  const expect = sign(ts);
  if (sig.length !== expect.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  return sig; // the signature doubles as the single-use key
}

function originAllowed(headers) {
  let o = headers.origin || headers.Origin || headers.referer || headers.Referer || "";
  if (!o) return true; // no Origin/Referer (some privacy setups) — rate limit still applies
  let host;
  try { host = new URL(o).hostname.toLowerCase(); } catch (e) { return false; }
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".netlify.app")) return true; // deploy previews + *.netlify.app
  return ALLOWED_HOSTS.indexOf(host) !== -1;
}

function clientIp(headers) {
  return headers["x-nf-client-connection-ip"] ||
    (headers["x-forwarded-for"] || "").split(",")[0].trim() || "";
}

exports.handler = async function (event) {
  let store;
  try {
    store = getStore("waitlist");
  } catch (e) {
    return ok({ pct: toPct(SEED) }); // Blobs unavailable — degrade to seed-only read
  }

  async function readCount() {
    try {
      const stored = await store.get("count");
      if (stored === null || stored === undefined || stored === "") return SEED;
      const n = parseInt(stored, 10);
      return Number.isFinite(n) ? n : SEED;
    } catch (e) { return SEED; }
  }

  if (event.httpMethod === "GET") {
    const count = await readCount();
    return ok({ pct: toPct(count), nonce: makeNonce() });
  }

  if (event.httpMethod === "POST") {
    const headers = event.headers || {};

    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch (e) {}

    // 1. Honeypot
    if (body && body._gotcha) return ok({ ok: false, skipped: "hp" });

    // 2. Origin allowlist
    if (!originAllowed(headers)) return ok({ ok: false, skipped: "origin" });

    // 3. Signed nonce (single-use + time-limited)
    const sig = verifyNonce(body && body.nonce);
    if (sig === null) return ok({ ok: false, skipped: "nonce" });
    if (sig !== "skip") {
      try {
        const used = await store.get("nu:" + sig);
        if (used) return ok({ ok: false, skipped: "replay" });
        await store.set("nu:" + sig, "1");
      } catch (e) { /* if the used-key store fails, fall through — rate limit still guards */ }
    }

    // 4. Per-IP rate limit
    const ip = clientIp(headers);
    if (ip) {
      const rlKey = "rl:" + crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
      const now = Date.now();
      let rec = {};
      try { const raw = await store.get(rlKey); if (raw) rec = JSON.parse(raw); } catch (e) {}
      if (!rec.start || now - rec.start > RATE_WINDOW_MS) rec = { start: now, n: 0 };
      if (rec.n >= RATE_MAX) return ok({ ok: false, skipped: "rate" });
      rec.n += 1;
      try { await store.set(rlKey, JSON.stringify(rec)); } catch (e) {}
    }

    // Passed all guards — increment (clamped to the cap).
    try {
      const count = await readCount();
      const next = count >= CAP ? count : count + 1;
      await store.set("count", String(next));
      return ok({ ok: true });
    } catch (e) {
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ ok: false }) };
    }
  }

  return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
};
