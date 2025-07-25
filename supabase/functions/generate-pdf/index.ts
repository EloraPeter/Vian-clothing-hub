import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'https://deno.land/x/execute@v1.1.0/mod.ts';
import { v4 as uuidv4 } from 'https://deno.land/std@0.224.0/uuid/mod.ts';

const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  Deno.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

    // return new Response("Method not allowed", { status: 405, headers });


serve(async (req) => {
  // 🛡️ Handle CORS preflight
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
    if (!['invoice', 'receipt'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid type' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Read template
    let template;
    try {
      template = type === 'invoice'
        ? Deno.readTextFileSync('Invoice.tex')
        : Deno.readTextFileSync('Receipt.tex');
    } catch (error) {
      return new Response(JSON.stringify({ error: `Template not found: ${type}.tex` }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fetch category names for products
    if (data.products) {
      const productRows = await Promise.all(data.products.map(async (p: { product_id: string }) => {
        const { data: product, error } = await supabase
          .from('products')
          .select('name, price, category_id, categories(name)')
          .eq('id', p.product_id)
          .eq('categories.id', 'category_id')
          .single();
        if (error) throw new Error(`Failed to fetch product: ${error.message}`);
        return `${product.name} & ${product.categories?.name || 'Uncategorized'} & ${product.price} \\\\`;
      }));
      data.product_table = productRows.join('\n');
    }

    // Replace placeholders
    let content = template;
    for (const [key, value] of Object.entries(data)) {
      content = content.replaceAll(`\\textbf{${key}}`, String(value));
    }

    const fileId = uuidv4();
    const fileName = `${type}_${fileId}.tex`;
    const texPath = `/tmp/${fileName}`;
    Deno.writeTextFileSync(texPath, content);

    // Compile PDF
    const result = await exec(`latexmk -pdf -outdir=/tmp ${texPath}`);
    if (result.status.code !== 0) {
      throw new Error(`latexmk failed: ${result.stderr}`);
    }

    const pdfPath = texPath.replace('.tex', '.pdf');
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(`${type}s/${fileName.replace('.tex', '.pdf')}`, Deno.readFileSync(pdfPath), {
        contentType: 'application/pdf',
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(`${type}s/${fileName.replace('.tex', '.pdf')}`);

    // Clean up
    Deno.removeSync(pdfPath);
    Deno.removeSync(texPath);

    return new Response(JSON.stringify({ pdfUrl: urlData.publicUrl }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

});