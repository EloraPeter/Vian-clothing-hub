export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.vianclothinghub.com.ng');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { reference } = req.body;
  if (!reference || typeof reference !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid reference is required' });
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Paystack verification response:', result);

    if (!response.ok || !result.status || result.data.status !== 'success') {
      console.error('Paystack verification failed:', result.message || 'Unknown error');
      return res.status(400).json({ success: false, error: result.message || 'Payment verification failed' });
    }

    return res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error('API error:', error.message);
    return res.status(500).json({ success: false, error: `Server error: ${error.message}` });
  }
}