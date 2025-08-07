const generateReceiptHtml = ({ order, user }) => {
    const itemsHtml = order.items
        .map(
            (item) => `
        <li style="margin-bottom: 10px;">
          <strong>${item.name}</strong><br />
          ${item.size ? `Size: ${item.size}${item.color ? `, Color: ${item.color}` : ''}<br />` : ''}
          Price: ₦${(item.discount_percentage > 0 ? item.price * (1 - item.discount_percentage / 100) : item.price).toLocaleString()} x ${item.quantity}<br />
          Total: ₦${((item.discount_percentage > 0 ? item.price * (1 - item.discount_percentage / 100) : item.price) * item.quantity).toLocaleString()}
        </li>
      `
        )
        .join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #800080; padding-bottom: 10px; margin-bottom: 20px; }
        .header img { max-width: 100px; }
        .header h1 { color: #800080; margin: 10px 0; }
        .details, .summary { margin-bottom: 20px; }
        .details p, .summary p { margin: 5px 0; }
        .items { margin-bottom: 20px; }
        .items ul { list-style: none; padding: 0; }
        .summary p strong { color: #800080; }
        .footer { text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        .download-link { text-align: center; margin: 20px 0; }
        .download-link a { display: inline-block; padding: 10px 20px; background-color: #800080; color: #fff; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
<img src="https://vian-clothing-hub.vercel.app/logo.svg" alt="Vian Clothing Hub Logo" />
          <h1>Vian Clothing Hub</h1>
          <h2>Receipt #${order.id}</h2>
          <p>Issued on: ${new Date(order.created_at).toLocaleDateString('en-GB')}</p>
        </div>
        <div class="details">
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Customer:</strong> ${user.email}</p>
          <p><strong>Delivery Address:</strong> ${order.address}</p>
        </div>
        <div class="items">
          <h3>Items</h3>
          <ul>${itemsHtml}</ul>
        </div>
        <div class="summary">
          <p><strong>Subtotal:</strong> ₦${(order.total - order.shipping_fee).toLocaleString()}</p>
          <p><strong>Shipping:</strong> ₦${order.shipping_fee.toLocaleString()}</p>
          <p><strong>Total:</strong> ₦${order.total.toLocaleString()}</p>
        </div>
        <div class="download-link">
          <a href="${order.receipt_url || '#'}" target="_blank">Download PDF Receipt</a>
        </div>
        <div class="footer">
          <p>Thank you for your purchase at Vian Clothing Hub!</p>
          <p>Contact us at: <a href="mailto:info@vianclothinghub.com.ng">info@vianclothinghub.com.ng</a> | +234 808 752 2801</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateReceiptHtml };