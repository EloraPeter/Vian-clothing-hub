import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, userId } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
  }

  try {
    // Get the authenticated user from the session
    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: sessionError } = await supabase.auth.getUser(token);
    if (sessionError || !user || user.id !== userId) {
      console.error('Session error:', sessionError?.message || 'User ID mismatch');
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing session' });
    }

    // Verify password for non-OAuth users
    if (user.app_metadata.provider !== 'facebook') {
      if (!password) {
        return res.status(400).json({ error: 'Password required for email users' });
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInError) {
        console.error('Password verification failed:', signInError.message);
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

    // Delete associated data (service role key bypasses RLS)
    const deletePromises = [
      supabase.from('profiles').delete().eq('id', user.id),
      supabase.from('orders').delete().eq('user_id', user.id),
      supabase.from('custom_orders').delete().eq('user_id', user.id),
      supabase.from('wishlist').delete().eq('user_id', user.id),
      supabase.from('invoices').delete().eq('user_id', user.id),
      supabase.from('receipts').delete().eq('user_id', user.id),
      supabase.from('notifications').delete().eq('user_id', user.id),
    ];

    const results = await Promise.allSettled(deletePromises);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to delete from table ${['profiles', 'orders', 'custom_orders', 'wishlist', 'invoices', 'receipts', 'notifications'][index]}:`, result.reason.message);
      }
    });

    // Delete the user from Supabase auth
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (authError) {
      console.error('Failed to delete user:', authError.message);
      throw new Error('Failed to delete user: ' + authError.message);
    }

    // Send confirmation email
    const emailResponse = await fetch('https://vianclothinghub.com.ng/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        subject: 'Vian Clothing Hub Account Deletion Confirmation',
        html: `
          <h2>Account Deletion Confirmation</h2>
          <p>Dear ${user.user_metadata.first_name || 'Customer'},</p>
          <p>Your Vian Clothing Hub account and associated data have been permanently deleted as of ${new Date().toLocaleString()}. This includes your profile, orders, wishlist, and any data shared via Facebook login.</p>
          <p>If this was a mistake, please contact <a href="mailto:support@vianclothinghub.com.ng">support@vianclothinghub.com.ng</a> immediately.</p>
          <p>Thank you for shopping with us!</p>
          <p>Vian Clothing Hub Team</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Failed to send email:', await emailResponse.text());
    }

    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error.message);
    return res.status(500).json({ error: error.message });
  }
}