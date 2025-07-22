import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')!;

serve(async (req) => {
  try {
    const { reference } = await req.json();
    
    // Verify payment with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    if (!result.status || result.data.status !== 'success') {
      return new Response(JSON.stringify({ success: false, error: 'Payment verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
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