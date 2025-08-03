const { Resend } = require('resend');

const sendReceiptEmail = async ({ email, order, receiptUrl }) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('RESEND_API_KEY is not set in environment variables');
    throw new Error('Email service configuration is missing');
  }

  const resend = new Resend(resendApiKey);

  try {
    const emailContent = `
      <h1>Vian Clothing Hub - Order Receipt</h1>
      <p>Thank you for your purchase!</p>
      <h2>Order #${order.id}</h2>
      <p><strong>Customer:</strong> ${email}</p>
      <p><strong>Delivery Address:</strong> ${order.address}</p>
      <h3>Items</h3>
      <ul>
        ${order.items
          .map(
            (item) => `
              <li>
                ${item.name} (${item.quantity}x) - ₦${(
              (item.discount_percentage > 0
                ? item.price * (1 - item.discount_percentage / 100)
                : item.price) * item.quantity
            ).toLocaleString()}
              </li>
            `
          )
          .join('')}
      </ul>
      <p><strong>Subtotal:</strong> ₦${(order.total - order.shipping_fee).toLocaleString()}</p>
      <p><strong>Shipping:</strong> ₦${order.shipping_fee.toLocaleString()}</p>
      <p><strong>Total:</strong> ₦${order.total.toLocaleString()}</p>
      ${receiptUrl ? `<p><a href="${receiptUrl}">Download Receipt PDF</a></p>` : ''}
      <p>Contact us at: info@vianclothinghub.com | +234 808 752 2801</p>
    `;

    await resend.emails.send({
      from: 'Vian Clothing Hub <info@vianclothinghub.com>',
      to: email,
      subject: `Order #${order.id} Receipt`,
      html: emailContent,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendReceiptEmail;