// pages/api/create-invoice.js
import { supabase } from '@/lib/supabaseClient';
import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { user_id, order_id, amount, custom_orders } = req.body;

    if (!user_id || !order_id || !amount || !custom_orders) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const invoiceData = {
            INVOICEID: crypto.randomUUID(),
            ORDERID: order_id,
            FULLNAME: custom_orders.full_name,
            FABRIC: custom_orders.fabric,
            STYLE: custom_orders.style,
            ADDRESS: custom_orders.address,
            DEPOSIT: Number(custom_orders.deposit || 5000).toLocaleString(),
            BALANCE: Number(amount - (custom_orders.deposit || 5000)).toLocaleString(),
            AMOUNT: Number(amount).toLocaleString(),
            DATE: new Date().toLocaleDateString(),
            products: custom_orders.products || [{ product_id: 'custom', name: 'Custom Order', price: amount }],
        };

        let pdfData;
        try {
            const { data, error } = await supabase.functions.invoke("generate-pdf", {
                body: { type: "invoice", data: invoiceData },
            });
            if (error) throw error;
            pdfData = data;
        } catch (supabaseError) {
            console.warn("Falling back to API endpoint for PDF generation:", supabaseError.message);
            const response = await fetch("/api/generate-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "invoice", data: invoiceData }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to generate PDF");
            pdfData = result;
        }

        const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .insert([
                {
                    user_id,
                    order_id,
                    amount,
                    paid: false,
                    pdf_url: pdfData.pdfUrl,
                },
            ])
            .select()
            .single();

        if (invoiceError) {
            console.error("Invoice creation failed:", invoiceError.message);
            throw new Error("Failed to create invoice");
        }

        const paymentLink = `https://vianclothinghub.com.ng/pay-invoice?invoice_id=${invoice.id}`;
        const emailBody = `
      <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vian Clothing Hub - New Invoice</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #ddd; border-radius: 8px;">
          <!-- Header -->
          <tr>
            <td style="text-align: center; border-bottom: 2px solid #800080; padding: 20px; margin-bottom: 20px;">
              <img src="https://vian-clothing-hub.vercel.app/logo.svg" alt="Vian Clothing Hub Logo" style="max-width: 100px; display: block; margin: 0 auto;" />
              <h1 style="color: #800080; margin: 10px 0; font-size: 24px;">Vian Clothing Hub</h1>
              <h2 style="font-size: 20px; margin: 0 0 10px;">New Invoice Created</h2>
              <p style="font-size: 14px; margin: 0;">Issued on: ${new Date().toLocaleDateString('en-GB')}</p>
            </td>
          </tr>
          <!-- Details -->
          <tr>
            <td style="padding: 0 20px 20px;">
              <p style="font-size: 16px; margin: 0 0 10px;">Dear ${custom_orders.full_name},</p>
              <p style="font-size: 14px; margin: 0 0 20px;">A new invoice has been created for your order. Please review the details below and make the payment at your earliest convenience.</p>
              <div style="margin-bottom: 20px;">
                <p style="font-size: 14px; margin: 5px 0;"><strong>Invoice ID:</strong> ${invoice.id}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Order ID:</strong> ${order_id}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Fabric:</strong> ${custom_orders.fabric}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Style:</strong> ${custom_orders.style}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Delivery Address:</strong> ${custom_orders.address}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Deposit:</strong> ₦${Number(custom_orders.deposit || 5000).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Balance:</strong> ₦${Number(amount - (custom_orders.deposit || 5000)).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</p>
                <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #800080;">Total Amount:</strong> ₦${Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</p>
              </div>
              <!-- Call-to-Action Buttons -->
              <div style="text-align: center; margin: 20px 0;">
                <a href="${pdfData.pdfUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #800080; color: #fff; text-decoration: none; border-radius: 5px; margin-right: 10px;">View/Download Invoice</a>
                <a href="${paymentLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #800080; color: #fff; text-decoration: none; border-radius: 5px;">Pay Now</a>
              </div>
              <p style="font-size: 14px; margin: 0 0 20px; text-align: center;">
                You can also view and pay this invoice from your dashboard: 
                <a href="https://vianclothinghub.com.ng/dashboard" style="color: #800080; text-decoration: none;">Go to Dashboard</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding: 20px;">
              <p style="margin: 0 0 10px;">Thank you for choosing Vian Clothing Hub!</p>
              <p style="margin: 0 0 10px;">
                🚫 Please do not reply to this email. This inbox is not monitored.<br>
                For support, contact us at <a href="mailto:support@vianclothinghub.com.ng" style="color: #800080; text-decoration: none;">support@vianclothinghub.com.ng</a>
              </p>
              <div style="margin: 0 0 10px;">
                <a href="https://instagram.com/vianclothinghub" style="color: #800080; text-decoration: none; margin: 0 5px;">Instagram</a> |
                <a href="https://twitter.com/vianclothinghub" style="color: #800080; text-decoration: none; margin: 0 5px;">Twitter</a> |
                <a href="https://facebook.com/vianclothinghub" style="color: #800080; text-decoration: none; margin: 0 5px;">Facebook</a>
              </div>
              <p style="margin: 0;">
                <a href="https://vianclothinghub.com.ng/shop" style="color: #800080; text-decoration: none;">Shop Now</a> | 
                <a href="https://vianclothinghub.com.ng" style="color: #800080; text-decoration: none;">Vian Clothing Hub</a>
              </p>
              <p style="margin: 10px 0 0;">Contact us at: <a href="mailto:info@vianclothinghub.com.ng" style="color: #800080; text-decoration: none;">info@vianclothinghub.com.ng</a> | +234 808 752 2801</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

        const emailResponse = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: custom_orders.email || (await supabase.from("profiles").select("email").eq("id", user_id).single()).data.email,
                subject: "New Invoice from Vian Clothing Hub",
                html: emailBody,
            }),
        });

        const emailResult = await emailResponse.json();
        if (!emailResponse.ok) {
            console.error("Email sending failed:", emailResult.error);
        }

        return res.status(200).json({ message: "Invoice created successfully", invoice });
    } catch (error) {
        console.error("Invoice creation error:", error.message);
        return res.status(500).json({ error: "Failed to create invoice: " + error.message });
    }
}