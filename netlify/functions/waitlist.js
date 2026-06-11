// Waitlist capacity counter for Latency.
// Keeps an accurate running count of real signups in a Netlify Blobs store and
// exposes ONLY a rounded percentage — never the raw number — so the homepage can
// render a "filling up" bar without ever revealing the actual size of the list.
//
// GET  -> { pct }            // 0–100, rounded; raw count never leaves the server
// POST -> { ok: true }       // increment by 1 (called after a real Formspree success)
//
// Setup:
//   1. Netlify → Site config → Environment variables →
//        WAITLIST_SEED = <current submission count from the Formspree dashboard>
//        WAITLIST_CAP  = 50            (optional; defaults to 50 — the free-plan limit)
//        WAITLIST_FLOOR = 0            (optional; min pct so the bar always looks full-ish)
//   2. Netlify Blobs is enabled by default — no extra setup needed.

const { getStore } = require("@netlify/blobs");

const CAP = Number(process.env.WAITLIST_CAP || 50);
const SEED = Number(process.env.WAITLIST_SEED || 0);
const FLOOR = Number(process.env.WAITLIST_FLOOR || 0);

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function toPct(count) {
  const raw = CAP > 0 ? (count / CAP) * 100 : 0;
  const pct = Math.min(100, Math.max(FLOOR, Math.round(raw)));
  return pct;
}

exports.handler = async function (event) {
  let store;
  try {
    store = getStore("waitlist");
  } catch (e) {
    // Blobs unavailable (e.g. misconfigured) — fail soft so the page just hides the bar.
    return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ pct: toPct(SEED) }) };
  }

  // Read current count; seed from env on first ever run.
  async function readCount() {
    const stored = await store.get("count");
    if (stored === null || stored === undefined || stored === "") return SEED;
    const n = parseInt(stored, 10);
    return Number.isFinite(n) ? n : SEED;
  }

  if (event.httpMethod === "GET") {
    try {
      const count = await readCount();
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ pct: toPct(count) }) };
    } catch (e) {
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ pct: toPct(SEED) }) };
    }
  }

  if (event.httpMethod === "POST") {
    // Honeypot guard: bots that fill _gotcha don't count.
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch (e) {}
    if (body && body._gotcha) {
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ ok: true }) };
    }

    try {
      const count = await readCount();
      // Don't run past the cap.
      const next = count >= CAP ? count : count + 1;
      await store.set("count", String(next));
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ ok: false }) };
    }
  }

  return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
};
