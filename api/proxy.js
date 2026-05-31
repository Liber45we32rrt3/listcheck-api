const DK_CLIENT_ID = "DfhRwX3gsNRVArj6UFbGbJBJlQiUXOFAaGklIKZlr3K25OJ6";
const DK_CLIENT_SECRET = "I9SeWG1GGO5GQIUeVRuenD7piiKE0qOvdMAvktpHH3RJTlGKVgWAA3AH77645P9O";
const MOUSER_KEY = "57a344f1-63db-4991-a2d0-e619f3649e01";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, pn } = req.query;

  if (action === "health") {
    return res.status(200).json({ status: "ok" });
  }

  if (action === "digikey" && pn) {
    const tokenRes = await fetch("https://api.digikey.com/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${DK_CLIENT_ID}&client_secret=${DK_CLIENT_SECRET}`
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) return res.status(400).json({ error: "no token" });

    // Try direct product lookup first
    const r1 = await fetch(`https://api.digikey.com/products/v4/search/${encodeURIComponent(pn)}/productdetails`, {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "X-DIGIKEY-Client-Id": DK_CLIENT_ID,
        "X-DIGIKEY-Locale-Site": "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD"
      }
    });
    const d1 = await r1.json();
    if (d1.Product) return res.status(200).json(d1);

    // Fallback: keyword search
    const r2 = await fetch(`https://api.digikey.com/products/v4/search/keyword`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "X-DIGIKEY-Client-Id": DK_CLIENT_ID,
        "X-DIGIKEY-Locale-Site": "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ Keywords: pn, Limit: 1, Offset: 0 })
    });
    const d2 = await r2.json();
    const prod = d2.Products?.[0] || null;
    return res.status(200).json({ Product: prod, _raw: d2 });
  }

  if (action === "mouser") {
    let body = "";
    await new Promise(resolve => { req.on("data", c => body += c); req.on("end", resolve); });
    const r = await fetch(`https://api.mouser.com/api/v1/search/partnumber?apiKey=${MOUSER_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
    return res.status(200).json(await r.json());
  }

  return res.status(400).json({ error: "invalid action" });
}
