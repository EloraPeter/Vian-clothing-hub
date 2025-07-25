// import { serve } from 'std/http/server.ts';
// import { createClient } from '@supabase/supabase-js';
// import { exec } from 'https://deno.land/x/execute@v1.1.0/mod.ts';
// import { v4 as uuidv4 } from 'https://deno.land/std@0.224.0/uuid/mod.ts';

// const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
// const supabaseKey = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
// if (!supabaseUrl || !supabaseKey) {
//   console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
//   Deno.exit(1);
// }
// const supabase = createClient(supabaseUrl, supabaseKey);

//     // return new Response("Method not allowed", { status: 405, headers });


// serve(async (req) => {
//   // 🛡️ Handle CORS preflight
//   if (req.method === 'OPTIONS') {
//     return new Response('ok', {
//       status: 200,
//       headers: {
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//       },
//     });
//   }

//   try {
//     const { type, data } = await req.json();
//     if (!['invoice', 'receipt'].includes(type)) {
//       return new Response(JSON.stringify({ error: 'Invalid type' }), {
//         status: 400,
//         headers: {
//           'Content-Type': 'application/json',
//           'Access-Control-Allow-Origin': '*',
//         },
//       });
//     }

//     // Read template
//     let template;
//     try {
//       template = type === 'invoice'
//         ? Deno.readTextFileSync('Invoice.tex')
//         : Deno.readTextFileSync('Receipt.tex');
//     } catch (error) {
//       return new Response(JSON.stringify({ error: `Template not found: ${type}.tex` }), {
//         status: 400,
//         headers: {
//           'Content-Type': 'application/json',
//           'Access-Control-Allow-Origin': '*',
//         },
//       });
//     }

//     // Fetch category names for products
//     if (data.products) {
//       const productRows = await Promise.all(data.products.map(async (p: { product_id: string }) => {
//         const { data: product, error } = await supabase
//           .from('products')
//           .select('name, price, category_id, categories(name)')
//           .eq('id', p.product_id)
//           .eq('categories.id', 'category_id')
//           .single();
//         if (error) throw new Error(`Failed to fetch product: ${error.message}`);
//         return `${product.name} & ${product.categories?.name || 'Uncategorized'} & ${product.price} \\\\`;
//       }));
//       data.product_table = productRows.join('\n');
//     }

//     // Replace placeholders
//     let content = template;
//     for (const [key, value] of Object.entries(data)) {
//       content = content.replaceAll(`\\textbf{${key}}`, String(value));
//     }

//     const fileId = uuidv4();
//     const fileName = `${type}_${fileId}.tex`;
//     const texPath = `/tmp/${fileName}`;
//     Deno.writeTextFileSync(texPath, content);

//     // Compile PDF
//     const result = await exec(`latexmk -pdf -outdir=/tmp ${texPath}`);
//     if (result.status.code !== 0) {
//       throw new Error(`latexmk failed: ${result.stderr}`);
//     }

//     const pdfPath = texPath.replace('.tex', '.pdf');
//     const { error: uploadError } = await supabase.storage
//       .from('documents')
//       .upload(`${type}s/${fileName.replace('.tex', '.pdf')}`, Deno.readFileSync(pdfPath), {
//         contentType: 'application/pdf',
//       });

//     if (uploadError) {
//       throw new Error(`Upload failed: ${uploadError.message}`);
//     }

//     const { data: urlData } = supabase.storage
//       .from('documents')
//       .getPublicUrl(`${type}s/${fileName.replace('.tex', '.pdf')}`);

//     // Clean up
//     Deno.removeSync(pdfPath);
//     Deno.removeSync(texPath);

//     return new Response(JSON.stringify({ pdfUrl: urlData.publicUrl }), {
//       status: 200,
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*',
//       },
//     });

//   } catch (error) {
//     return new Response(JSON.stringify({ error: error.message }), {
//       status: 500,
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*',
//       },
//     });
//   }

// });



import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as path from 'https://deno.land/std@0.177.0/path/mod.ts';
import { exec } from 'https://deno.land/std@0.177.0/node/child_process.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY')
);

serve(async (req) => {

  //  🛡️ Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { type, data } = await req.json();
    console.log('Received payload:', JSON.stringify(data, null, 2));

    const template = type === 'invoice' ? 'Invoice.tex' : 'Receipt.tex';
    const templatePath = path.join('/app', template);
    const outputPath = `/tmp/output-${data.INVOICEID}.tex`;
    const pdfPath = `/tmp/output-${data.INVOICEID}.pdf`;

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
          reject(err);
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

    if (uploadError) throw uploadError;

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