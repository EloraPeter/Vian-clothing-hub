import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const oauthProviders = ['facebook', 'google'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized:grado: Missing or invalid Authorization header' });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error: sessionError } = await supabase.auth.getUser(token);
    if (sessionError || !user || user.id !== userId) {
      console.error('Session error:', sessionError?.message || 'User ID mismatch', { userId, user });
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing session' });
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
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (authError) {
      console.error('Failed to delete user after retries:', authError.message);
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
          <p>Your account has been permanently deleted from Vian Clothing Hub as of ${new Date().toLocaleString()}.</p>
          <p>Contact <a href="mailto:support@vianclothinghub.com.ng">support@vianclothinghub.com.ng</a> if you have questions.</p>
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