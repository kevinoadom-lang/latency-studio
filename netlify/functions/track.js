// Meta Conversions API (server-side) endpoint for Latency.
// Receives a browser event (with a shared event_id for de-duplication against
// the pixel), hashes PII, and forwards to Meta. No-ops safely until the
// META_CAPI_TOKEN environment variable is set in Netlify.
//
// Setup:
//   1. Events Manager → Data Sources → your pixel (427714368008362) →
//      Settings → Conversions API → "Generate access token".
//   2. Netlify → Site config → Environment variables → add
//      META_CAPI_TOKEN = <that token>.  (Optionally META_TEST_EVENT_CODE while testing.)

const crypto = require("crypto");

const PIXEL_ID = "427714368008362";
const GRAPH_VERSION = "v19.0";

function sha256(value) {
  return crypto.createHash("sha256").update(String(value).trim().toLowerCase()).digest("hex");
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const TOKEN = process.env.META_CAPI_TOKEN;
  if (!TOKEN) {
    // Not configured yet — succeed quietly so the browser call never errors.
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: "no token" }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid json" }) };
  }

  const headers = event.headers || {};
  const user_data = {
    client_user_agent: headers["user-agent"] || headers["User-Agent"] || "",
    client_ip_address:
      headers["x-nf-client-connection-ip"] ||
      (headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      ""
  };
  if (data.email) user_data.em = [sha256(data.email)];
  if (data.fbp) user_data.fbp = data.fbp;
  if (data.fbc) user_data.fbc = data.fbc;

  const payload = {
    data: [
      {
        event_name: data.event_name || "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: data.event_id,
        action_source: "website",
        event_source_url: data.event_source_url,
        user_data: user_data,
        custom_data: data.custom_data || {}
      }
    ]
  };
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const res = await fetch(
      "https://graph.facebook.com/" + GRAPH_VERSION + "/" + PIXEL_ID +
        "/events?access_token=" + encodeURIComponent(TOKEN),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    const out = await res.json().catch(function () { return {}; });
    return { statusCode: res.ok ? 200 : 502, body: JSON.stringify(out) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: String(e) }) };
  }
};
