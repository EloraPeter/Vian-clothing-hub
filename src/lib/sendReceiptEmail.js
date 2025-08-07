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
      <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vian Clothing Hub - Order Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #ddd; border-radius: 8px;">
          <!-- Header -->
          <tr>
            <td style="text-align: center; border-bottom: 2px solid #800080; padding: 20px; margin-bottom: 20px;">
              <img src="https://vian-clothing-hub.vercel.app/logo.svg" alt="Vian Clothing Hub Logo" style="max-width: 100px; display: block; margin: 0 auto;" />
              <h1 style="color: #800080; margin: 10px 0; font-size: 24px;">Vian Clothing Hub</h1>
              <h2 style="font-size: 20px; margin: 0 0 10px;">Receipt #${order.id}</h2>
              <p style="font-size: 14px; margin: 0;">Issued on: ${new Date(order.created_at).toLocaleDateString('en-GB')}</p>
            </td>
          </tr>
          <!-- Details -->
          <tr>
            <td style="padding: 0 20px 20px;">
              <div style="margin-bottom: 20px;">
                <p style="font-size: 14px; margin: 5px 0;"><strong>Customer:</strong> ${email}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Delivery Address:</strong> ${order.address}</p>
              </div>
              <!-- Items -->
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 18px; margin: 0 0 15px;">Items</h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${order.items
        .map(
          (item) => `
                        <li style="font-size: 14px; margin-bottom: 10px;">
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
              </div>
              <!-- Summary -->
              <div style="margin-bottom: 20px;">
                <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Subtotal:</strong> ₦${(order.total - order.shipping_fee).toLocaleString()}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Shipping:</strong> ₦${order.shipping_fee.toLocaleString()}</p>
                <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #800080;">Total:</strong> ₦${order.total.toLocaleString()}</p>
              </div>
              <!-- Download Link -->
              ${receiptUrl ? `
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${receiptUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #800080; color: #fff; text-decoration: none; border-radius: 5px;">Download PDF Receipt</a>
                </div>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding: 20px;">
              <p style="margin: 0 0 10px;">Thank you for your purchase at Vian Clothing Hub!</p>
              <p style="margin: 0 0 10px;">
                🚫 Please do not reply to this email. This inbox is not monitored.<br>
                For support, contact us at <a href="mailto:support@vianclothinghub.com.ng" style="color: #800080; text-decoration: none;">support@vianclothinghub.com.ng</a>
              </p>
              <div style="margin: 0 0 10px;">
                <a href="https://instagram.com/vianclothinghub" style="color: #800080; text-decoration: none; margin: 0 5px;">Instagram</a> |
                <a href="https://twitter.com/vianclothinghub" style="color: #800080; text-decoration: none; margin: 0 5px;">Twitter</a> |
                <a href="https://facebook.com/vianclothinghub" style="color: #800080; text-decoration: none; margin: 0 5px;">Facebook</a>
              </div>
              <p style="margin: 0;">
                <a href="https://vianclothinghub.com.ng/shop" style="color: #800080; text-decoration: none;">Shop Now</a> | 
                <a href="https://vianclothinghub.com.ng" style="color: #800080; text-decoration: none;">Vian Clothing Hub</a>
              </p>
              <p style="margin: 10px 0 0;">Contact us at: <a href="mailto:info@vianclothinghub.com.ng" style="color: #800080; text-decoration: none;">info@vianclothinghub.com.ng</a> | +234 808 752 2801</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await resend.emails.send({
      from: 'Vian Clothing Hub <info@vianclothinghub.com.ng>',
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