// Las API keys se leen desde Variables de Entorno de Vercel.
// NO se escriben en el código. En Vercel: Settings > Environment Variables
// y creás: DK_CLIENT_ID, DK_CLIENT_SECRET, MOUSER_KEY
const DK_CLIENT_ID = process.env.DK_CLIENT_ID;
const DK_CLIENT_SECRET = process.env.DK_CLIENT_SECRET;
const MOUSER_KEY = process.env.MOUSER_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, pn } = req.query;

  if (action === "health") return res.status(200).json({ status: "ok" });

  // ── DIGIKEY ──────────────────────────────────────────
  if (action === "digikey" && pn) {
    const tokenRes = await fetch("https://api.digikey.com/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${DK_CLIENT_ID}&client_secret=${DK_CLIENT_SECRET}`
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) return res.status(400).json({ error: "no token" });
    const r = await fetch(`https://api.digikey.com/products/v4/search/${encodeURIComponent(pn)}/productdetails`, {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "X-DIGIKEY-Client-Id": DK_CLIENT_ID,
        "X-DIGIKEY-Locale-Site": "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD"
      }
    });
    return res.status(200).json(await r.json());
  }

  // ── MOUSER ───────────────────────────────────────────
  if (action === "mouser" && pn) {
    const r = await fetch(`https://api.mouser.com/api/v1/search/partnumber?apiKey=${MOUSER_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        SearchByPartRequest: {
          mouserPartNumber: pn,
          partSearchOptions: "None"
        }
      })
    });
    const data = await r.json();
    // Devuelve el error de Mouser tal cual para poder diagnosticar
    return res.status(200).json(data);
  }

  return res.status(400).json({ error: "invalid action" });
}
