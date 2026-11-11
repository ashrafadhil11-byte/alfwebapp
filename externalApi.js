// externalApi.js - Unified Al-Farha Online Order Fetcher (Mobile & Desktop)
// Uses Vercel /api/order-proxy with automatic fallback to GAS fetchExternalOrder (api-direct.alfarhaonline.com)

async function fetchDirectFromAlfarha(scannedId, userBranch) {
  if (window.AFC_API && typeof window.AFC_API.fetchAlfarhaOrder === 'function') {
    return await window.AFC_API.fetchAlfarhaOrder(scannedId, userBranch);
  }
  const orderNo = encodeURIComponent(String(scannedId || '').trim().replace(/^'/, ''));
  try {
    const response = await fetch('/api/order-proxy?order_no=' + orderNo, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error('Proxy error: ' + response.status);
    const data = await response.json();
    return { success: true, apiData: data };
  } catch (error) {
    return { success: false, message: 'Failed to reach Al-Farha Online Order API.' };
  }
}
