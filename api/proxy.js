const DK_CLIENT_ID = "DfhRwX3gsNRVArj6UFbGbJBJlQiUXOFAaGklIKZlr3K25OJ6";
const DK_CLIENT_SECRET = "I9SeWG1GGO5GQIUeVRuenD7piiKE0qOvdMAvktpHH3RJTlGKVgWAA3AH77645P9O";
const MOUSER_KEY = "57a344f1-63db-4991-a2d0-e619f3649e01";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action, pn } = req.query;

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

  if (action === "mouser") {
    const body = await new Promise(resolve => {
      let data = "";
      req.on("data", chunk => data += chunk);
      req.on("end", () => resolve(JSON.parse(data)));
    });
    const r = await fetch(`https://api.mouser.com/api/v1/search/partnumber?apiKey=${MOUSER_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.status(200).json(await r.json());
  }

  return res.status(400).json({ error: "invalid action" });
}
