import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

    // Fetch user by email using admin.listUsers
    const { data: users, error: listUsersError } = await supabase.auth.admin.listUsers();
    if (listUsersError) {
      console.error('List users error:', listUsersError);
      return res.status(500).json({ error: `Failed to fetch users: ${listUsersError.message}` });
    }

    const user = users.users.find((u) => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Update user password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
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