import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const postmarkApiKey = Deno.env.get('POSTMARK_API_KEY')!;

serve(async (req) => {
  try {
    const { to, subject, html } = await req.json();
    
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': postmarkApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        From: 'support@vianclothinghub.com',
        To: to,
        Subject: subject,
        HtmlBody: html,
        MessageStream: 'outbound',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});