import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function verifySignedRequest(signedRequest, appSecret) {
  const [encodedSig, payload] = signedRequest.split('.');
  const signature = Buffer.from(encodedSig, 'base64').toString('hex');
  const data = Buffer.from(payload, 'base64').toString();
  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');
  if (signature !== expectedSig) {
    throw new Error('Invalid signature');
  }
  return JSON.parse(data);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signed_request } = req.body;
    if (!signed_request) return res.status(400).json({ error: 'Missing signed_request' });

    const appSecret = process.env.FACEBOOK_APP_SECRET || 'your-facebook-app-secret';
    const data = verifySignedRequest(signed_request, appSecret);
    const facebookId = data.user_id;

    // Find the user by Facebook ID in raw_user_meta_data
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const userData = users.find(u => u.raw_user_meta_data?.provider_id === facebookId);
    if (!userData) {
      return res.status(200).json({
        url: 'https://vianclothinghub.com.ng/account-deletion',
        confirmation_code: crypto.randomUUID(),
      });
    }

    // Call RPC to delete everything including the auth user
    const { error: rpcError } = await supabase.rpc('delete_user_data', { p_user_id: userData.id });
    if (rpcError) throw rpcError;

    // Send confirmation email
    await fetch('https://vianclothinghub.com.ng/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: userData.email,
        subject: 'Vian Clothing Hub Data Deletion Confirmation (Facebook)',
        html: `
          <h2>Data Deletion Confirmation</h2>
          <p>Your data associated with your Facebook login has been deleted from Vian Clothing Hub as of ${new Date().toLocaleString()}.</p>
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
    console.error('Error in deletion callback:', error);
    return res.status(500).json({ error: error.message });
  }
}
