import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);
const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

serve(async (req) => {
  console.log(`Received ${req.method} request to /verify-paystack-payment`, {
    headers: Object.fromEntries(req.headers),
    url: req.url,
    body: req.method === 'POST' ? await req.json() : null,
  });

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

    const { reference } = await req.json();
    if (!reference) {
      console.error('Missing reference in request body');
      return new Response(JSON.stringify({ success: false, error: 'Reference is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Verifying Paystack transaction with reference: ${reference}`);

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    console.log('Paystack verification response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('Paystack API error:', {
        status: response.status,
        statusText: response.statusText,
        message: result.message || 'Unknown error',
      });
      return new Response(JSON.stringify({ success: false, error: 'Paystack API error: ' + (result.message || 'Unknown error') }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!result.status || result.data.status !== 'success') {
      console.error('Paystack verification failed:', {
        status: result.status,
        message: result.message || 'Unknown error',
        data: result.data,
      });
      return new Response(JSON.stringify({ success: false, error: 'Payment verification failed: ' + (result.message || 'Unknown error') }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in verify-paystack-payment:', {
      message: error.message,
      stack: error.stack,
    });
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});