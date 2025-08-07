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

    const paymentLink = `https://your-app-url.com/pay-invoice?invoice_id=${invoice.id}`;
    const emailBody = `
      <h2>New Invoice Created</h2>
      <p>Dear ${custom_orders.full_name},</p>
      <p>A new invoice has been created for your order. Please review the details below and make the payment at your earliest convenience.</p>
      <p><strong>Invoice Details</strong></p>
      <p>Invoice ID: ${invoice.id}</p>
      <p>Order ID: ${order_id}</p>
      <p>Fabric: ${custom_orders.fabric}</p>
      <p>Style: ${custom_orders.style}</p>
      <p>Delivery Address: ${custom_orders.address}</p>
      <p>Deposit: ₦${Number(custom_orders.deposit || 5000).toLocaleString()}</p>
      <p>Balance: ₦${Number(amount - (custom_orders.deposit || 5000)).toLocaleString()}</p>
      <p>Total Amount: ₦${Number(amount).toLocaleString()}</p>
      <p>Date: ${new Date().toLocaleDateString()}</p>
      <p><a href="${pdfData.pdfUrl}">View/Download Invoice</a></p>
      <p><a href="${paymentLink}" style="background-color: #6b46c1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a></p>
      <p>You can also view and pay this invoice from your dashboard: <a href="https://vianclothinghub.com.ng/dashboard">Go to Dashboard</a></p>
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