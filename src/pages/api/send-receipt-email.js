import sendReceiptEmail from '@/lib/sendReceiptEmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { email, order, receiptUrl } = req.body;
    if (!email || !order) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await sendReceiptEmail({ email, order, receiptUrl });
    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return res.status(200).json({ message: 'Email sending failed, but order processed' });
  }
}