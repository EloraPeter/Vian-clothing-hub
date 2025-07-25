import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as path from 'https://deno.land/std@0.177.0/path/mod.ts';
import { exec } from 'https://deno.land/std@0.177.0/node/child_process.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || 'https://qsxoycbgstdmwnihazlq.supabase.co',
  Deno.env.get('SUPABASE_ANON_KEY') || ''
);

serve(async (req) => {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { type, data } = await req.json();
    console.log('Received payload:', JSON.stringify(data, null, 2));

    // Validate inputs
    if (!type || !['invoice', 'receipt'].includes(type)) {
      throw new Error('Invalid type: must be "invoice" or "receipt"');
    }
    if (!data || !data.INVOICEID) {
      throw new Error('Missing INVOICEID in data');
    }

    const template = type === 'invoice' ? 'Invoice.tex' : 'Receipt.tex';
    const templatePath = path.join('/app', template);
    const outputPath = `/tmp/output-${data.INVOICEID}.tex`;
    const pdfPath = `/tmp/output-${data.INVOICEID}.pdf`;

    // Verify template exists
    try {
      await Deno.stat(templatePath);
    } catch (error) {
      throw new Error(`Template file ${template} not found`);
    }

    // Read template
    const templateContent = await Deno.readTextFile(templatePath);

    // Build product table
    let productTable = '';
    for (const product of data.products || []) {
      if (product.product_id === 'custom') {
        productTable += `${product.name || 'Custom Item'} & ${product.category || 'Custom Order'} & ${product.price || 0} \\\\ \n`;
      } else {
        const { data: productData, error } = await supabase
          .from('products')
          .select('name, price, categories(name)')
          .eq('id', product.product_id)
          .single();
        if (error) throw error;
        productTable += `${productData.name} & ${productData.categories?.name || 'Uncategorized'} & ${productData.price} \\\\ \n`;
      }
    }

    // Replace placeholders
    const content = templateContent
      .replace('INVOICEID', data.INVOICEID || 'N/A')
      .replace('ORDERID', data.ORDERID || 'N/A')
      .replace('FULLNAME', data.FULLNAME || 'N/A')
      .replace('FABRIC', data.FABRIC || 'N/A')
      .replace('STYLE', data.STYLE || 'N/A')
      .replace('ADDRESS', data.ADDRESS || 'N/A')
      .replace('DEPOSIT', data.DEPOSIT || '0')
      .replace('BALANCE', data.BALANCE || '0')
      .replace('AMOUNT', data.AMOUNT || '0')
      .replace('DATE', data.DATE || new Date().toLocaleDateString('en-GB'))
      .replace('product_table', productTable || 'No items specified & None & 0 \\\\ \n');

    // Write LaTeX file
    await Deno.writeTextFile(outputPath, content);

    // Compile LaTeX
    await new Promise((resolve, reject) => {
      exec(`latexmk -pdf -outdir=/tmp ${outputPath}`, (err, stdout, stderr) => {
        if (err) {
          console.error('LaTeX compilation error:', stderr);
          reject(new Error(`LaTeX compilation failed: ${stderr}`));
        } else {
          console.log('LaTeX compilation output:', stdout);
          resolve();
        }
      });
    });

    // Upload PDF to Supabase storage
    const pdfContent = await Deno.readFile(pdfPath);
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

    return new Response(JSON.stringify({ url: urlData.publicUrl }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error in generate-pdf:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});