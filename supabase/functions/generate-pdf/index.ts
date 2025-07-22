import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'https://deno.land/x/execute@v1.2.0/mod.ts';
import { serve } from 'std/http/server.ts';
import { exec } from 'https://deno.land/x/execute@v1.2.0/mod.ts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const { type, data } = await req.json();
    const template = type === 'invoice' ? Deno.readTextFileSync('Invoice.tex') : Deno.readTextFileSync('Receipt.tex');
    
    // Replace placeholders
    let content = template;
    for (const [key, value] of Object.entries(data)) {
      content = content.replaceAll(`\\textbf{${key}}`, String(value));
    }

    // Write temporary LaTeX file
    const fileName = `${type}_${data[`${type.toUpperCase()}ID`]}.tex`;
    Deno.writeTextFileSync(`/tmp/${fileName}`, content);

    // Compile LaTeX to PDF
    await exec(`latexmk -pdf -outdir=/tmp /tmp/${fileName}`);

    // Upload PDF to Supabase storage
    const pdfPath = `/tmp/${fileName.replace('.tex', '.pdf')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(`${type}s/${fileName.replace('.tex', '.pdf')}`, Deno.readFileSync(pdfPath), {
        contentType: 'application/pdf',
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(`${type}s/${fileName.replace('.tex', '.pdf')}`);

    // Clean up
    Deno.removeSync(pdfPath);
    Deno.removeSync(`/tmp/${fileName}`);

    return new Response(JSON.stringify({ pdfUrl: urlData.publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});