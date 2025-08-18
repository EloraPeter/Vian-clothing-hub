import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.error('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp } = req.body;

  if (!email || !otp) {
    console.error('Missing email or OTP:', { email, otp });
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API key is missing');
    return res.status(500).json({ error: 'Server configuration error: Missing Resend API key' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: 'no-reply@vianclothinghub.com.ng',
      to: email,
      subject: 'Your OTP for Password Reset - Vian Clothing Hub',
      text: `Your OTP is ${otp}. It expires in 10 minutes. If you didn’t request a password reset, please ignore this email.`,
      html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Password Reset OTP - Vian Clothing Hub</title>
    </head>
    <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f4;color:#333;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;background-color:#f4f4f4;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ddd;border-radius:8px;">
              <!-- Header -->
              <tr>
                <td style="text-align:center;border-bottom:2px solid #800080;padding:20px;">
                  <img src="https://vian-clothing-hub.vercel.app/logo.svg" alt="Vian Clothing Hub Logo" style="max-width:100px;margin:0 auto;display:block;" />
                  <h1 style="color:#800080;margin:10px 0;font-size:22px;">Vian Clothing Hub</h1>
                  <h2 style="margin:0;font-size:18px;">Password Reset OTP</h2>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:20px;">
                  <p style="font-size:16px;margin:0 0 10px;">Hello,</p>
                  <p style="font-size:14px;margin:0 0 15px;">Here is your One-Time Password (OTP) to reset your password:</p>
                  <p style="font-size:22px;font-weight:bold;color:#800080;text-align:center;margin:20px 0;">${otp}</p>
                  <p style="font-size:13px;color:#666;text-align:center;margin:0 0 20px;">⚠️ This OTP will expire in <strong>10 minutes</strong>.</p>
                  <p style="font-size:14px;margin:0 0 20px;">If you didn’t request a password reset, you can safely ignore this email.</p>
                  <p style="font-size:14px;margin:0;">Best regards,<br><strong>Vian Clothing Hub</strong></p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="text-align:center;font-size:12px;color:#666;border-top:1px solid #ddd;padding:20px;">
                  <p style="margin:0 0 10px;">Thank you for trusting Vian Clothing Hub 💜</p>
                  <p style="margin:0 0 10px;">For support, contact us at <a href="mailto:support@vianclothinghub.com.ng" style="color:#800080;text-decoration:none;">support@vianclothinghub.com.ng</a></p>
                  <p style="margin:0 0 10px;">
                    <a href="https://instagram.com/vianclothinghub" style="color:#800080;text-decoration:none;margin:0 5px;">Instagram</a> |
                    <a href="https://twitter.com/vianclothinghub" style="color:#800080;text-decoration:none;margin:0 5px;">Twitter</a> |
                    <a href="https://facebook.com/vianclothinghub" style="color:#800080;text-decoration:none;margin:0 5px;">Facebook</a>
                  </p>
                  <p style="margin:0;"><a href="https://vianclothinghub.com.ng" style="color:#800080;text-decoration:none;">vianclothinghub.com.ng</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
    });


    if (error) {
      console.error('Resend API error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({ error: `Failed to send OTP email: ${error.message || 'Unknown error'}` });
    }

    console.log('Resend API success:', data);
    return res.status(200).json({ message: 'OTP sent successfully', data });
  } catch (err) {
    console.error('Unexpected error in send-otp:', err);
    return res.status(500).json({ error: `Unexpected error: ${err.message || 'Unknown error'}` });
  }
}