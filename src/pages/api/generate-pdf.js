// pages/api/generate-pdf.js
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, data } = req.body;

  if (!type || !data) {
    return res.status(400).json({ error: 'Type and data are required' });
  }

  try {
    // Replace with your actual PDF generation logic (e.g., using pdfkit or a similar library)
    // This is a placeholder; you'll need to integrate your PDF generation service
    const pdfUrl = `https://your-pdf-storage.com/receipt-${data.RECEIPTID}.pdf`; // Example URL
    return res.status(200).json({ pdfUrl });
  } catch (error) {
    console.error('PDF generation error:', error.message);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
}