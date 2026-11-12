export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const GAS_URL = process.env.GOOGLE_API_URL || 'https://script.google.com/macros/s/AKfycbwycWJw0iiCfF9ZFfj3rNpBsfiITySuJrvlSgmFW10aFBR1Qx0xwmTv30jRlZW83f-oSw/exec';

  try {
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: payload
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch (err) {
      return res.status(502).json({
        success: false,
        message: 'Invalid JSON response from Google Apps Script.',
        raw: text.substring(0, 200)
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'GAS Proxy Error: ' + error.message
    });
  }
}
