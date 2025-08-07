import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import DressLoader from "@/components/DressLoader";
import Script from "next/script";

export default function PayInvoice() {
    const router = useRouter();
    const { invoice_id } = router.query;
    const [invoice, setInvoice] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!invoice_id) return;

        async function fetchInvoice() {
            try {
                const { data: userData } = await supabase.auth.getSession();
                if (!userData.session) {
                    router.push("/auth");
                    return;
                }

                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select("email")
                    .eq("id", userData.session.user.id)
                    .single();
                if (profileError) throw profileError;
                setProfile(profileData);

                const { data, error } = await supabase
                    .from("invoices")
                    .select("*, custom_orders(*)")
                    .eq("id", invoice_id)
                    .single();
                if (error) throw error;
                setInvoice(data);
            } catch (err) {
                setError(err.message);
            }
            setLoading(false);
        }

        fetchInvoice();
    }, [invoice_id, router]);

    const generateReceiptPDF = async (invoice, paymentReference) => {
        const receiptData = {
            RECEIPTID: crypto.randomUUID(),
            INVOICEID: invoice.id,
            ORDERID: invoice.order_id,
            PAYMENTREF: paymentReference,
            FULLNAME: invoice.custom_orders.full_name,
            FABRIC: invoice.custom_orders.fabric,
            STYLE: invoice.custom_orders.style,
            ADDRESS: invoice.custom_orders.address,
            DEPOSIT: Number(invoice.custom_orders.deposit || 5000).toLocaleString(),
            BALANCE: Number(invoice.amount - (invoice.custom_orders.deposit || 5000)).toLocaleString(),
            AMOUNT: Number(invoice.amount).toLocaleString(),
            DATE: new Date().toLocaleDateString(),
        };

        try {
            const { data, error } = await supabase.functions.invoke("generate-pdf", {
                body: { type: "receipt", data: receiptData },
            });

            if (error) throw error;
            return { pdfUrl: data.pdfUrl, receiptId: receiptData.RECEIPTID };
        } catch (supabaseError) {
            console.warn("Falling back to API endpoint for PDF generation:", supabaseError.message);
            const response = await fetch("/api/generate-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "receipt", data: receiptData }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to generate PDF");
            return { pdfUrl: result.pdfUrl, receiptId: receiptData.RECEIPTID };
        }
    };

    const initiatePayment = async () => {
        if (!window.PaystackPop) {
            alert("Paystack SDK not loaded.");
            return;
        }

        const handler = window.PaystackPop.setup({
            key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
            email: profile.email,
            amount: (invoice.amount - (invoice.custom_orders.deposit || 5000)) * 100,
            currency: "NGN",
            ref: `VIAN_${invoice.id}_${Date.now()}`,
            callback: async (response) => {
                try {
                    let verificationResult;
                    try {
                        const { data, error } = await supabase.functions.invoke("verify-paystack-payment", {
                            body: { reference: response.reference },
                            headers: { "Content-Type": "application/json" },
                        });
                        if (error) throw error;
                        verificationResult = data;
                    } catch (supabaseError) {
                        console.warn("Falling back to API endpoint:", supabaseError.message);
                        const apiResponse = await fetch("/api/verify-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reference: response.reference }),
                        });

                        const json = await apiResponse.json();
                        if (!apiResponse.ok || !json.status || json.data?.status !== "success") {
                            throw new Error(json.error || "Payment verification failed");
                        }
                        verificationResult = json.data;
                    }

                    if (verificationResult.status !== "success") {
                        alert("Payment verification failed: " + (verificationResult.message || "Unknown error"));
                        return;
                    }

                    const { error: updateError } = await supabase
                        .from("invoices")
                        .update({ paid: true })
                        .eq("id", invoice.id);
                    if (updateError) throw updateError;

                    const { pdfUrl, receiptId } = await generateReceiptPDF(invoice, response.reference);
                    const receipt = {
                        id: receiptId,
                        invoice_id: invoice.id,
                        user_id: invoice.user_id,
                        amount: invoice.amount,
                        payment_reference: response.reference,
                        pdf_url: pdfUrl,
                    };

                    const { error: receiptError } = await supabase.from("receipts").insert([receipt]);
                    if (receiptError) throw receiptError;

                    await supabase
                        .from("custom_orders")
                        .update({ delivery_status: "in_progress" })
                        .eq("id", invoice.order_id);

                    const notificationText = `Payment successful for order ID: ${invoice.order_id}. Delivery has started. Check your dashboard for the receipt: https://vianclothinghub.com.ng/dashboard`;
                    await supabase.from("notifications").insert([
                        {
                            user_id: invoice.user_id,
                            message: notificationText,
                            created_at: new Date().toISOString(),
                            read: false,
                        },
                    ]);

                    const emailBody = `
            <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vian Clothing Hub - Payment Confirmation</title>
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
              <h2 style="font-size: 20px; margin: 0 0 10px;">Payment Confirmation</h2>
              <p style="font-size: 14px; margin: 0;">Issued on: ${new Date().toLocaleDateString('en-GB')}</p>
            </td>
          </tr>
          <!-- Details -->
          <tr>
            <td style="padding: 0 20px 20px;">
              <p style="font-size: 16px; margin: 0 0 20px;">Your payment for order ID: ${invoice.order_id} has been received.</p>
              <div style="margin-bottom: 20px;">
                <p style="font-size: 14px; margin: 5px 0;"><strong>Order ID:</strong> ${invoice.order_id}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Customer:</strong> ${invoice.custom_orders.full_name}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Fabric:</strong> ${invoice.custom_orders.fabric}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Style:</strong> ${invoice.custom_orders.style}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Delivery Address:</strong> ${invoice.custom_orders.address}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Deposit:</strong> ₦${Number(invoice.custom_orders.deposit || 5000).toLocaleString()}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Balance Paid:</strong> ₦${Number(invoice.amount - (invoice.custom_orders.deposit || 5000)).toLocaleString()}</p>
                <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #800080;">Total Amount:</strong> ₦${Number(invoice.amount).toLocaleString()}</p>
                <p style="font-size: 14px; margin: 5px 0;"><strong>Payment Reference:</strong> ${response.reference}</p>
              </div>
              <!-- Download Link and Dashboard -->
              <div style="text-align: center; margin: 20px 0;">
                <a href="${pdfUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #800080; color: #fff; text-decoration: none; border-radius: 5px; margin-right: 10px;">View/Download Receipt</a>
                <a href="https://vianclothinghub.com.ng" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #800080; color: #fff; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
              </div>
              <p style="font-size: 14px; margin: 0 0 20px; text-align: center;">Delivery has started. Please check the app for updates.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding: 20px;">
              <p style="margin: 0 0 10px;">Thank you for your purchase at Vian Clothing Hub!</p>
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
                            to: profile.email,
                            subject: "Payment Receipt from Vian Clothing Hub",
                            html: emailBody,
                        }),
                    });

                    if (!emailResponse.ok) {
                        console.error("Email sending failed:", await emailResponse.json());
                    }

                    alert("Payment successful! Receipt generated and emailed.");
                    router.push("/dashboard");
                } catch (error) {
                    console.error("Payment processing error:", error.message);
                    alert("Error processing payment: " + error.message);
                }
            },
            onClose: () => {
                alert("Payment cancelled.");
            },
        });
        handler.openIframe();
    };

    if (loading) return <DressLoader />;
    if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;
    if (!invoice) return <p className="p-6 text-center text-gray-600">No invoice found.</p>;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Script
                src="https://js.paystack.co/v2/inline.js"
                strategy="afterInteractive"
                onError={(e) => console.error('Paystack script failed to load:', e)}
            />
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-semibold text-purple-800 mb-4">Pay Invoice</h2>
                <p><strong>Invoice ID:</strong> {invoice.id}</p>
                <p><strong>Order ID:</strong> {invoice.order_id}</p>
                <p><strong>Fabric:</strong> {invoice.custom_orders.fabric}</p>
                <p><strong>Style:</strong> {invoice.custom_orders.style}</p>
                <p><strong>Deposit:</strong> ₦{Number(invoice.custom_orders.deposit || 5000).toLocaleString()}</p>
                <p><strong>Balance:</strong> ₦{Number(invoice.amount - (invoice.custom_orders.deposit || 5000)).toLocaleString()}</p>
                <p><strong>Total Amount:</strong> ₦{Number(invoice.amount).toLocaleString()}</p>
                <button
                    onClick={initiatePayment}
                    className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                >
                    Pay Now
                </button>
            </div>
        </div>
    );
}