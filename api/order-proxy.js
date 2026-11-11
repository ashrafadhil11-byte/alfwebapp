export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-KEY');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const order_no = (req.query && req.query.order_no) || (req.body && req.body.order_no);

  if (!order_no) {
    return res.status(400).json({ error: 'Missing order_no parameter' });
  }

  const cleanOrderNo = String(order_no).trim().replace(/^'/, '');
  const encodedOrder = encodeURIComponent(cleanOrderNo);

  // Try api-direct.alfarhaonline.com first (bypasses Cloudflare proxy), then fallback to alfarhaonline.com
  const candidateEndpoints = [
    `https://api-direct.alfarhaonline.com/api/order-details?order_no=${encodedOrder}`,
    `https://alfarhaonline.com/api/order-details?order_no=${encodedOrder}`
  ];

  // Try configured env key or both known key variants from GAS (Bln2x0) and PWA (B1n2x0)
  const apiKeys = [
    process.env.ALFARHA_ORDER_API_KEY,
    'R681hJQUTSXBqf6QHxLasBln2x0',
    'R681hJQUTSXBqf6QHxLasB1n2x0'
  ].filter(Boolean);

  let lastErrorText = '';

  for (const targetUrl of candidateEndpoints) {
    for (const apiKey of apiKeys) {
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'User-Agent': 'AlFarha-Scanner-App/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({ order_no: cleanOrderNo })
        });

        const rawText = await response.text();
        lastErrorText = rawText;

        const data = JSON.parse(rawText);
        if (data && (data.response === 'success' || data.data)) {
          return res.status(200).json(data);
        }
      } catch (err) {
        lastErrorText = err.message || String(err);
      }
    }
  }

  return res.status(502).json({
    error: 'External API blocked the request or order was not found.',
    details: String(lastErrorText).substring(0, 150)
  });
}
