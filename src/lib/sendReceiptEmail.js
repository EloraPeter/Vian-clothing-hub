const { Resend } = require('resend');
const { generateReceiptHtml } = require('./generateReceiptHtml');

const sendReceiptEmail = async ({ email, order, receiptUrl }) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'Vian Clothing Hub <no-reply@vianclothinghub.com>',
      to: email,
      subject: `Your Vian Clothing Hub Receipt #${order.id}`,
      html: generateReceiptHtml({ order: { ...order, receipt_url: receiptUrl }, user: { email } }),
      text: `Your order #${order.id} receipt is available. View details at your order page or download the PDF at ${receiptUrl}.`,
    });
    console.log(`Receipt email sent to ${email}`);
  } catch (error) {
    console.error('Error sending receipt email:', error);
    throw new Error('Failed to send receipt email');
  }
};

module.exports = { sendReceiptEmail };