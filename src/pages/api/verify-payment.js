export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, error: 'Method not allowed' });
  }

  const { reference } = req.body;
  if (!reference || typeof reference !== 'string') {
    return res.status(400).json({ status: false, error: 'Valid reference is required' });
  }

  try {
    // Place this at the very start of your verification API endpoint
    const key = process.env.PAYSTACK_SECRET_KEY;

    if (!key) {
      console.error("❌ PAYSTACK_SECRET_KEY is NOT set in this environment.");
    } else {
      console.log(`✅ PAYSTACK_SECRET_KEY loaded: ${key.slice(0, 10)}...`);
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    let result;
    try {
      result = await response.json();
    } catch (error) {
      console.error('JSON parsing error:', error);
      return res.status(500).json({ status: false, error: 'Failed to parse Paystack response' });
    }

    console.log('Paystack verification response:', result);

    if (!response.ok || result.status !== true || result.data?.status !== 'success') {
      console.error('VERIFICATION FAILURE:', {
        httpOk: response.ok,
        paystackStatus: result.status,
        txStatus: result.data?.status,
        raw: result,
      });
      return res.status(400).json({
        status: false,
        error: result.message || 'Payment verification failed',
        txStatus: result.data?.status,
      });
    }

    return res.status(200).json({ status: true, data: result.data });
  } catch (error) {
    console.error('API error:', error.message);
    return res.status(500).json({ status: false, error: `Server error: ${error.message}` });
  }
}