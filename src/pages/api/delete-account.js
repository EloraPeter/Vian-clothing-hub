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
          <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background-color: #8B5CF6; padding: 20px; text-align: center; }
    .header img { max-width: 150px; height: auto; }
    .content { padding: 20px; color: #333333; }
    h1 { font-size: 24px; color: #8B5CF6; margin-bottom: 10px; }
    p { font-size: 16px; line-height: 1.5; margin: 10px 0; }
    .cta-button { display: inline-block; padding: 12px 24px; background-color: #8B5CF6; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; margin: 10px 0; }
    .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 14px; color: #666666; }
    .footer a { color: #8B5CF6; text-decoration: none; }
    .social-links { margin: 10px 0; }
    .social-links a { margin: 0 10px; text-decoration: none; }
    .return-section { background-color: #f0ebff; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center; }
    @media (max-width: 600px) { .container { margin: 10px; } h1 { font-size: 20px; } .cta-button { padding: 10px 20px; font-size: 14px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://vianclothinghub.com.ng/logo.svg" alt="Vian Clothing Hub Logo">
    </div>
    <div class="content">
      <h1>Account Deletion Confirmation</h1>
      <p>Dear ${form.full_name},</p>
      <p>Your account has been <strong>permanently deleted</strong> from Vian Clothing Hub as of ${new Date().toLocaleString()}.</p>
      <p>If you have any questions or need assistance, please contact us at <a href="mailto:support@vianclothinghub.com.ng" style="color: #8B5CF6;">support@vianclothinghub.com.ng</a>.</p>
      <p>We're sorry to see you go and hope to serve you again in the future.</p>

      <div class="return-section">
        <p><strong>We’d love to have you back!</strong></p>
        <p>Come back to Vian Clothing Hub and enjoy 10% off your first order when you return.</p>
        <p>
          <a href="https://vianclothinghub.com.ng/shop" class="cta-button">Claim Your 10% Off</a>
        </p>
      </div>

      <p>
        <a href="https://vianclothinghub.com.ng" class="cta-button">Visit Vian Clothing Hub</a>
      </p>
    </div>
    <div class="footer">
      <p>🚫 Please do not reply to this email. This inbox is not monitored.<br>
      For support, contact us at <a href="mailto:support@vianclothinghub.com.ng">support@vianclothinghub.com.ng</a></p>
      <div class="social-links">
        <a href="https://instagram.com/vianclothinghub">Instagram</a> |
        <a href="https://twitter.com/vianclothinghub">Twitter</a> |
        <a href="https://facebook.com/vianclothinghub">Facebook</a>
      </div>
      <p><a href="https://vianclothinghub.com.ng/shop">Shop Now</a> | <a href="https://vianclothinghub.com.ng">Vian Clothing Hub</a></p>
    </div>
  </div>
</body>
</html>

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