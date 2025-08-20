import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const oauthProviders = ['facebook', 'google']; // Add more providers as needed

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
    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: sessionError } = await supabase.auth.getUser(token);
    if (sessionError || !user || user.id !== userId) {
      console.error('Session error:', sessionError?.message || 'User ID mismatch', { userId, user });
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing session' });
    }

    // Verify password for non-OAuth users
    if (!oauthProviders.includes(user.app_metadata.provider)) {
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

    // Verify user exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user.id);
    if (userError || !userData) {
      console.error('User not found:', user.id, userError?.message);
      throw new Error('User not found');
    }

    // Delete associated data
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
        console.error(`Failed to delete from table ${['profiles', 'orders', 'custom_orders', 'wishlist', 'invoices', 'receipts', 'notifications'][index]}:`, result.reason);
      }
    });

    // Delete user with retry logic
    let authError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (!error) break;
      authError = error;
      console.error(`Attempt ${attempt} failed to delete user:`, error.message);
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
    }
    if (authError) {
      console.error('Failed to delete user after retries:', authError.message, authError);
      throw new Error('Failed to delete user: ' + authError.message);
    }

    const emailResponse = await fetch('https://vianclothinghub.com.ng/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: user.email,
        subject: 'Vian Clothing Hub Account Deletion Confirmation',
        html: `...`,
      }),
    });
    if (!emailResponse.ok) {
      console.error('Failed to send email:', await emailResponse.text());
    }

    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error.message, error);
    return res.status(500).json({ error: error.message });
  }
}