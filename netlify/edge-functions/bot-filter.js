// Blocks known AI / SEO / data-scraper bots at the edge before any HTML is
// served, so they don't burn Netlify bandwidth. Real users, search engines
// (Googlebot/Bingbot), and Meta's ad-preview scraper (facebookexternalhit)
// are intentionally NOT in the list and pass straight through.
//
// Wired in netlify.toml to run only on page requests (static assets are
// excluded there) — blocking the HTML stops a crawler from discovering and
// downloading the images, which is where the bandwidth actually goes.

const BLOCKED = [
  // AI / answer-engine crawlers
  "gptbot", "oai-searchbot", "chatgpt-user", "claudebot", "claude-web",
  "anthropic-ai", "ccbot", "google-extended", "meta-externalagent",
  "meta-externalfetcher", "perplexitybot", "applebot-extended", "bytespider",
  "amazonbot", "diffbot", "omgili", "timpibot", "cohere-ai", "imagesiftbot",
  // SEO / backlink / data-mining crawlers
  "ahrefsbot", "semrushbot", "mj12bot", "dotbot", "dataforseobot", "petalbot",
  "blexbot", "rogerbot", "dataprovider", "serpstatbot", "barkrowler",
  "zoominfobot", "seokicks", "megaindex",
];

export default async (request, context) => {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  if (ua && BLOCKED.some((bot) => ua.includes(bot))) {
    return new Response("Forbidden", {
      status: 403,
      headers: { "content-type": "text/plain", "x-blocked-by": "bot-filter" },
    });
  }
  return context.next();
};
