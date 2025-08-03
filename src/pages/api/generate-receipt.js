const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins (restrict to 'http://localhost:3000' in dev if needed)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { order, user } = req.body;

    if (!order || !order.id || !order.items || !user || !user.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`receipts/${order.id}.pdf`, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(`receipts/${order.id}.pdf`);

      if (!urlData.publicUrl) {
        throw new Error('Failed to generate public URL for receipt');
      }

      res.status(200).json({ url: urlData.publicUrl });
    });

    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 50, { width: 100 });
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#800080')
      .text('Vian Clothing Hub', 200, 50, { align: 'center' })
      .fontSize(16)
      .text('Receipt', 200, 75, { align: 'center' })
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#000000')
      .text(`Receipt ID: ${order.id}`, 400, 50)
      .text(`Issued on: ${new Date(order.created_at).toLocaleDateString('en-GB')}`, 200, 100, { align: 'center' });

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Order Details', 50, 150)
      .font('Helvetica')
      .fontSize(10)
      .text(`Order ID: ${order.id}`, 50, 170)
      .text(`Customer: ${user.email}`, 50, 185)
      .text(`Delivery Address: ${order.address}`, 50, 200, { width: 300 });

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Items', 50, 240)
      .font('Helvetica')
      .fontSize(10);

    let y = 260;
    doc
      .text('Product', 50, y)
      .text('Category', 200, y)
      .text('Price (₦)', 350, y, { align: 'right' })
      .text('Qty', 450, y, { align: 'right' });
    doc
      .moveTo(50, y + 15)
      .lineTo(500, y + 15)
      .stroke();

    y += 25;
    for (const item of order.items) {
      const price = item.discount_percentage > 0
        ? item.price * (1 - item.discount_percentage / 100)
        : item.price;
      doc
        .text(item.name, 50, y, { width: 140 })
        .text(item.category || 'N/A', 200, y)
        .text(Number(price).toLocaleString(), 350, y, { align: 'right' })
        .text(item.quantity, 450, y, { align: 'right' });
      y += 20;
    }
    doc
      .moveTo(50, y)
      .lineTo(500, y)
      .stroke();

    y += 20;
    doc
      .font('Helvetica-Bold')
      .text('Summary', 50, y)
      .font('Helvetica')
      .fontSize(10);
    y += 20;
    doc
      .text('Subtotal', 350, y, { align: 'right' })
      .text(`₦${(order.total - order.shipping_fee).toLocaleString()}`, 450, y, { align: 'right' });
    y += 15;
    doc
      .text('Shipping', 350, y, { align: 'right' })
      .text(`₦${order.shipping_fee.toLocaleString()}`, 450, y, { align: 'right' });
    y += 15;
    doc
      .font('Helvetica-Bold')
      .text('Total', 350, y, { align: 'right' })
      .text(`₦${order.total.toLocaleString()}`, 450, y, { align: 'right' });

    y += 40;
    doc
      .fontSize(10)
      .fillColor('#800080')
      .text('Thank you for your purchase at Vian Clothing Hub!', 50, y, { align: 'center' })
      .text('Contact us at: info@vianclothinghub.com | +234 808 752 2801', 50, y + 15, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: error.message });
  }
};