import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-supabase-url.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { google_user_id } = req.body;
    if (!google_user_id) {
      return res.status(400).json({ error: 'Missing Google user ID' });
    }

    // Query auth.users to find user by Google ID in raw_user_meta_data
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const userData = users.find(user => user.raw_user_meta_data?.sub === google_user_id);
    if (!userData) {
      return res.status(200).json({
        url: 'https://vianclothinghub.com.ng/account-deletion',
        confirmation_code: crypto.randomUUID(),
      });
    }

    // Call RPC to delete everything including auth user
    const { error: rpcError } = await supabase.rpc('delete_user_data', { p_user_id: userData.id });
    if (rpcError) throw rpcError;

    // Send confirmation email
    await fetch('https://vianclothinghub.com.ng/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userData.email,
        subject: 'Vian Clothing Hub Data Deletion Confirmation (Google)',
        html: `
          <h2>Data Deletion Confirmation</h2>
          <p>Your data associated with your Google login has been deleted from Vian Clothing Hub as of ${new Date().toLocaleString()}.</p>
          <p>Contact <a href="mailto:support@vianclothinghub.com.ng">support@vianclothinghub.com.ng</a> if you have questions.</p>
          <p>Vian Clothing Hub Team</p>
        `,
      }),
    });

    return res.status(200).json({
      url: 'https://vianclothinghub.com.ng/account-deletion',
      confirmation_code: crypto.randomUUID(),
    });
  } catch (error) {
    console.error('Error in Google deletion callback:', error);
    return res.status(500).json({ error: error.message });
  }
}
