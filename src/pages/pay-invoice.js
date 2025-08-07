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

          const notificationText = `Payment successful for order ID: ${invoice.order_id}. Delivery has started. Check your dashboard for the receipt: https://your-app-url.com/dashboard`;
          await supabase.from("notifications").insert([
            {
              user_id: invoice.user_id,
              message: notificationText,
              created_at: new Date().toISOString(),
              read: false,
            },
          ]);

          const emailBody = `
            <h2>Payment Confirmation</h2>
            <p>Your payment for order ID: ${invoice.order_id} has been received.</p>
            <p><strong>Receipt</strong></p>
            <p>Order ID: ${invoice.order_id}</p>
            <p>Customer: ${invoice.custom_orders.full_name}</p>
            <p>Fabric: ${invoice.custom_orders.fabric}</p>
            <p>Style: ${invoice.custom_orders.style}</p>
            <p>Delivery Address: ${invoice.custom_orders.address}</p>
            <p>Deposit: ₦${Number(invoice.custom_orders.deposit || 5000).toLocaleString()}</p>
            <p>Balance Paid: ₦${Number(invoice.amount - (invoice.custom_orders.deposit || 5000)).toLocaleString()}</p>
            <p>Total Amount: ₦${Number(invoice.amount).toLocaleString()}</p>
            <p>Payment Reference: ${response.reference}</p>
            <p>Date: ${new Date().toLocaleDateString()}</p>
            <p><a href="${pdfUrl}">View/Download Receipt</a></p>
            <p>Delivery has started. Please check the app for updates: <a href="https://vianclothinghub.com.ng">Go to Dashboard</a></p>
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