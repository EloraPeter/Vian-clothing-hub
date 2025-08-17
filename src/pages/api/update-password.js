import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }

  try {
    const currentTime = DateTime.now().setZone('Africa/Lagos').toUTC().toISO();

    // Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .gte('expires_at', currentTime)
      .single();

    if (otpError || !otpData) {
      console.error('OTP verification error:', otpError);
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Update user password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      (await supabase.auth.admin.getUserByEmail(email)).data.user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: `Failed to update password: ${updateError.message}` });
    }

    // Delete used OTP
    const { error: deleteError } = await supabase.from('otps').delete().eq('email', email);
    if (deleteError) {
      console.error('OTP deletion error:', deleteError);
      // Log error but don't block success
    }

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Unexpected error in update-password:', err);
    return res.status(500).json({ error: `Unexpected error: ${err.message}` });
  }
}