export default async function handler(req, res) {
  const { path } = req.query;
  const targetUrl = `https://qsxoycbgstdmwnihazlq.supabase.co/${path ? path.join('/') : ''}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        'Host': 'qsxoycbgstdmwnihazlq.supabase.co',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    const data = await response.text();
    res.status(response.status)
      .setHeader('Access-Control-Allow-Origin', 'https://vianclothinghub.com.ng')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, apikey')
      .send(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error: ' + error.message });
  }
}