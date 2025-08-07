// pages/api/generate-pdf.js
import { supabase } from '@/lib/supabaseClient';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
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

  if (!type || !['invoice', 'receipt'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type: must be "invoice" or "receipt"' });
  }
  if (!data || !data.INVOICEID) {
    return res.status(400).json({ error: 'Missing INVOICEID in data' });
  }

  try {
    // Build product table
    let productTable = '';
    for (const product of data.products || []) {
      if (product.product_id === 'custom') {
        productTable += `${product.name || 'Custom Item'} - ${product.category || 'Custom Order'} - ₦${product.price || 0}\n`;
      } else {
        const { data: productData, error } = await supabase
          .from('products')
          .select('name, price, categories(name)')
          .eq('id', product.product_id)
          .single();
        if (error) throw error;
        productTable += `${productData.name} - ${productData.categories?.name || 'Uncategorized'} - ₦${productData.price}\n`;
      }
    }

    // Create PDF
    const doc = new PDFDocument();
    const pdfPath = `/tmp/output-${data.INVOICEID}.pdf`;
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Add content to PDF
    doc.fontSize(20).text(`${type.charAt(0).toUpperCase() + type.slice(1)}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`ID: ${data.INVOICEID || 'N/A'}`);
    doc.text(`Order ID: ${data.ORDERID || 'N/A'}`);
    doc.text(`Customer: ${data.FULLNAME || 'N/A'}`);
    doc.text(`Fabric: ${data.FABRIC || 'N/A'}`);
    doc.text(`Style: ${data.STYLE || 'N/A'}`);
    doc.text(`Address: ${data.ADDRESS || 'N/A'}`);
    doc.text(`Deposit: ₦${data.DEPOSIT || '0'}`);
    doc.text(`Balance: ₦${data.BALANCE || '0'}`);
    doc.text(`Total Amount: ₦${data.AMOUNT || '0'}`);
    doc.text(`Date: ${data.DATE || new Date().toLocaleDateString('en-GB')}`);
    doc.moveDown();
    doc.text('Items:');
    doc.text(productTable || 'No items specified');

    doc.end();

    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Upload PDF to Supabase storage
    const pdfContent = fs.readFileSync(pdfPath);
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(`${type}s/${data.INVOICEID}.pdf`, pdfContent, {
        contentType: 'application/pdf',
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(`${type}s/${data.INVOICEID}.pdf`);

    // Clean up
    fs.unlinkSync(pdfPath);

    return res.status(200).json({ pdfUrl: urlData.publicUrl });
  } catch (error) {
    console.error('PDF generation error:', error.message);
    return res.status(500).json({ error: 'Failed to generate PDF: ' + error.message });
  }
}