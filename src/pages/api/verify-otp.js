// pages/api/verify-otp.js
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server-side
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    const gracePeriod = 5 * 60 * 1000; // 5 minutes
    const currentTime = DateTime.now().setZone('Africa/Lagos').toUTC().toISO();
    console.log('Current time (UTC):', currentTime);

    const { data, error } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .gte('expires_at', currentTime)
      .single();

    if (error || !data) {
      console.error('OTP verification error:', error);
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    console.log('OTP verified:', data);
    return res.status(200).json({ message: 'OTP verified' });
  } catch (err) {
    console.error('Unexpected error in verify-otp:', err);
    return res.status(500).json({ error: `Unexpected error: ${err.message}` });
  }
}