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

        // Call your Postgres function to delete user + associated data
        const { error: rpcError } = await supabase.rpc('delete_user_data', { p_user_id: user.id });
        if (rpcError) {
            console.error('RPC error:', rpcError.message);
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