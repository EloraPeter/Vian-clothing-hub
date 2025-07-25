import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  console.log(`Request: ${req.method} ${req.url}`, {
    headers: Object.fromEntries(req.headers),
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!supabaseUrl || !supabaseKey || !paystackSecretKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (err) {
      console.error('Invalid JSON:', err.message);
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { reference } = body;
    if (!reference) {
      console.error('Missing reference');
      return new Response(JSON.stringify({ success: false, error: 'Reference is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Verifying Paystack transaction: ${reference}`);
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Paystack response:', result);

    if (!response.ok || !result.status || result.data.status !== 'success') {
      console.error('Paystack verification failed:', result.message || 'Unknown error');
      return new Response(JSON.stringify({ success: false, error: result.message || 'Payment verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Function error:', error.message, error.stack);
    return new Response(JSON.stringify({ success: false, error: `Server error: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});