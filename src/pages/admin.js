import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import Navbar from "@/components/Navbar";
import DressLoader from "@/components/DressLoader";
import { colorMap } from "@/lib/colorMap";
import ProfileSection from "@/components/admin/ProfileSection";
import AddProductForm from "@/components/admin/AddProductForm";
import ProductsTable from "@/components/admin/ProductsTable";
import VariantsModal from "@/components/admin/VariantsModal";
import ShippingFeesTable from "@/components/admin/ShippingFeesTable";
import CustomOrdersTable from "@/components/admin/CustomOrdersTable";
import ProductOrdersTable from "@/components/admin/ProductOrdersTable";
import { FaUser, FaBox, FaShippingFast, FaTshirt, FaSignOutAlt, FaBars, FaBell } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [productOrders, setProductOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [shippingFees, setShippingFees] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [currentCustomOrderPage, setCurrentCustomOrderPage] = useState(1);
  const [currentProductOrderPage, setCurrentProductOrderPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [orderPrices, setOrderPrices] = useState({});
  const [discountInputs, setDiscountInputs] = useState({});
  const [activeSection, setActiveSection] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (!session) {
          router.push("/login");
        } else {
          setUser(session.user);
        }
      }
    );
    return () => authListener.subscription?.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    async function fetchProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select("email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else {
        setProfile(data || { email: user.email, avatar_url: null });
      }
    }

    async function fetchData() {
      setLoading(true);
      try {
        const [
          { data: customOrderData, error: customOrderError },
          { data: productOrderData, error: productOrderError },
          { data: productData, error: productError },
          { data: categoryData, error: categoryError },
          { data: variantsData, error: variantsError },
          { data: shippingFeesData, error: shippingFeesError },
          { data: notificationsData, error: notificationsError },
        ] = await Promise.all([
          supabase.from("custom_orders").select("*").order("created_at", { ascending: false }),
          supabase.from("orders").select("*, items").order("created_at", { ascending: false }),
          supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
          supabase.from("categories").select("id, name, slug"),
          supabase.from("product_variants").select("id, product_id, size, color, stock_quantity, additional_price"),
          supabase.from("shipping_fees").select("id, state_name, shipping_fee"),
          supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);
        if (customOrderError) setError(customOrderError.message);
        else setOrders(customOrderData || []);

        if (productOrderError) setError(productOrderError.message);
        else setProductOrders(productOrderData || []);

        if (productError) setError(productError.message);
        else setProducts(productData || []);

        if (categoryError) setError(categoryError.message);
        else setCategories(categoryData || []);

        if (variantsError) setError(variantsError.message);
        else {
          const variantsByProduct = {};
          variantsData.forEach((variant) => {
            if (!variantsByProduct[variant.product_id]) {
              variantsByProduct[variant.product_id] = [];
            }
            variantsByProduct[variant.product_id].push(variant);
          });
          setVariants(variantsByProduct);
        }

        if (shippingFeesError) setError(shippingFeesError.message);
        else setShippingFees(shippingFeesData || []);

        if (notificationsError) setError(notificationsError.message);
        else setNotifications(notificationsData || []);

        setLoading(false);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }

    fetchProfile();
    fetchData();
  }, [user]);

  const markNotificationAsRead = async (notificationId) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);
    if (!error) {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    }
  };

  const markAllNotificationsAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (!error) {
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
      toast.success("All notifications marked as read.");
    } else {
      console.error("Error marking all notifications as read:", error.message);
      toast.error("Error marking all notifications as read: " + error.message);
    }
  };

  const sendWhatsAppNotification = async (phone, text) => {
    const apiKey = "1999329";
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(
      text
    )}&apikey=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          "Failed to send WhatsApp notification:",
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error sending WhatsApp notification:", error);
    }
  };

  const sendEmailNotification = async (email, subject, body) => {
    const { error } = await supabase.functions.invoke("send-email", {
      body: { to: email, subject, html: body },
    });
    if (error) {
      console.error("Error sending email:", error.message);
    }
  };

  const createInAppNotification = async (userId, message) => {
    const { error } = await supabase.from("notifications").insert([
      {
        user_id: userId,
        message,
        created_at: new Date().toISOString(),
        read: false,
      },
    ]);
    if (error) {
      console.error("Error creating in-app notification:", error.message);
    }
  };

  const generateInvoicePDF = async (order, amount, userId, email) => {
    const invoiceData = {
      INVOICEID: crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      ORDERID: order.id,
      FULLNAME: order.full_name || "N/A",
      FABRIC: order.fabric || "N/A",
      STYLE: order.style || "N/A",
      ADDRESS: order.address || "N/A",
      DEPOSIT: Number(order.deposit || 0).toLocaleString("en-NG", { minimumFractionDigits: 0 }),
      BALANCE: Number(amount - (order.deposit || 0)).toLocaleString("en-NG", { minimumFractionDigits: 0 }),
      AMOUNT: Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 0 }),
      DATE: new Date().toLocaleDateString("en-GB"),
      products: [
        {
          product_id: "custom",
          name: `${order.fabric || "Custom"} ${order.style || "Item"}`,
          price: Number(amount),
          category: "Custom Order",
        },
      ],
    };

    try {
      let pdfData;
      try {
        const { data, error } = await supabase.functions.invoke("generate-pdf", {
          body: { type: "invoice", data: invoiceData },
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        });

        if (error) throw new Error(`Supabase PDF generation failed: ${error.message}`);
        pdfData = data;
      } catch (supabaseError) {
        console.warn("Falling back to API endpoint for PDF generation:", supabaseError.message);
        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "invoice", data: invoiceData }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to generate PDF via API");
        pdfData = result;
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert([
          {
            user_id: userId,
            order_id: order.id,
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
                <p style="font-size: 16px; margin: 0 0 10px;">Dear ${order.full_name},</p>
                <p style="font-size: 14px; margin: 0 0 20px;">A new invoice has been created for your order. Please review the details below and make the payment at your earliest convenience.</p>
                <div style="margin-bottom: 20px;">
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Invoice ID:</strong> ${invoice.id}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Order ID:</strong> ${order.id}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Fabric:</strong> ${order.fabric}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Style:</strong> ${order.style}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Delivery Address:</strong> ${order.address}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Deposit:</strong> ₦${Number(order.deposit || 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Balance:</strong> ₦${Number(amount - (order.deposit || 0)).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</p>
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
          to: email,
          subject: "New Invoice from Vian Clothing Hub",
          html: emailBody,
        }),
      });

      const emailResult = await emailResponse.json();
      if (!emailResponse.ok) {
        console.error("Email sending failed:", emailResult.error);
      } else {
        console.log("Invoice email sent successfully:", emailResult.message);
      }

      return { pdfUrl: pdfData.pdfUrl, invoiceId: invoiceData.INVOICEID, invoice };
    } catch (error) {
      console.error("Error in generateInvoicePDF:", error.message);
      throw new Error(`Invoice generation failed: ${error.message}`);
    }
  };

  async function updateCustomOrderStatus(id, newStatus) {
    const price = orderPrices[id] || 0;
    if (newStatus === "in progress" && !price) {
      toast.warning("Please set a price before marking as in progress.");
      return;
    }

    const updates = { status: newStatus };
    if (newStatus === "in progress") {
      updates.price = parseFloat(price);
    }

    const { error, data } = await supabase
      .from("custom_orders")
      .update(updates)
      .eq("id", id)
      .select("*, profiles(email)")
      .single();

    if (error) {
      console.error("Error updating status:", error.message);
      toast.error("Error updating status: " + error.message);
      return;
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, ...updates } : order
      )
    );

    if (newStatus === "in progress") {
      const order = data;
      try {
        const { pdfUrl, invoiceId } = await generateInvoicePDF(order, price, order.user_id, order.profiles?.email || order.email);
        const { error: invoiceError } = await supabase
          .from("invoices")
          .insert([
            {
              id: invoiceId,
              order_id: order.id,
              user_id: order.user_id,
              amount: parseFloat(price),
              pdf_url: pdfUrl,
            },
          ]);

        if (invoiceError) {
          console.error("Error creating invoice:", invoiceError.message);
          toast.error("Error creating invoice: " + invoiceError.message);
          return;
        }

        const paymentLink = `https://vianclothinghub.com.ng/pay-invoice?invoice_id=${invoiceId}`;
        const notificationText = `Your custom order (ID: ${order.id}) is now in progress! View your invoice: ${pdfUrl}`;
        await sendWhatsAppNotification(order.phone, notificationText);

        const email = order.profiles?.email || order.email;
        if (!email) {
          console.error("No email found for order:", order.id);
          toast.error("Failed to send invoice email: No email address found");
          return;
        }

        const emailBody = `
          <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vian Clothing Hub - Order Update</title>
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
                <h2 style="font-size: 20px; margin: 0 0 10px;">Order Update</h2>
                <p style="font-size: 14px; margin: 0;">Issued on: ${new Date().toLocaleDateString('en-GB')}</p>
              </td>
            </tr>
            <!-- Details -->
            <tr>
              <td style="padding: 0 20px 20px;">
                <p style="font-size: 16px; margin: 0 0 10px;">Dear ${order.full_name},</p>
                <p style="font-size: 14px; margin: 0 0 20px;">Your custom order (ID: ${order.id}) is now in progress.</p>
                <div style="margin-bottom: 20px;">
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Invoice ID:</strong> ${invoiceId}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Order ID:</strong> ${order.id}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Fabric:</strong> ${order.fabric || "N/A"}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Style:</strong> ${order.style || "N/A"}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong>Delivery Address:</strong> ${order.address || "N/A"}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Deposit:</strong> ₦${Number(order.deposit || 0).toLocaleString("en-NG")}</p>
                  <p style="font-size: 14px; margin: 5px 0;"><strong style="color: #800080;">Balance:</strong> ₦${Number(price - (order.deposit || 0)).toLocaleString("en-NG")}</p>
                  <p style="font-size: 16px; margin: 5px 0;"><strong style="color: #800080;">Total Amount:</strong> ₦${Number(price).toLocaleString("en-NG")}</p>
                </div>
                <!-- Call-to-Action Buttons -->
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${pdfUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #800080; color: #fff; text-decoration: none; border-radius: 5px; margin-right: 10px;">View/Download Invoice</a>
                  <a href="${paymentLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #800080; color: #fff; text-decoration: none; border-radius: 5px;">Pay Now</a>
                </div>
                <p style="font-size: 14px; margin: 0 0 20px; text-align: center;">
                  Please check the app for more details: 
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

        try {
          const emailResponse = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: email,
              subject: "Order In Progress - Invoice",
              html: emailBody,
            }),
          });

          const emailResult = await emailResponse.json();
          if (!emailResponse.ok) {
            console.error("Email sending failed:", emailResult.error);
            toast.error("Failed to send invoice email: " + emailResult.error);
          } else {
            console.log("Invoice email sent successfully:", emailResult.message);
          }
        } catch (emailError) {
          console.error("Error sending email:", emailError.message);
          toast.error("Error sending invoice email: " + emailError.message);
        }

        await createInAppNotification(
          order.user_id,
          `Your order (ID: ${order.id}) is now in progress. Check your dashboard for the invoice: ${paymentLink}`
        );
      } catch (error) {
        console.error("Error generating PDF or invoice:", error.message);
        toast.error("Error generating PDF: " + error.message);
      }
    }
  }

  async function updateProductOrderStatus(id, newStatus) {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Error updating status: " + error.message);
    } else {
      setProductOrders((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, status: newStatus } : order
        )
      );
      const order = productOrders.find((o) => o.id === id);
      if (order) {
        const notificationText = `Your order (ID: ${id}) is now ${newStatus.replace(
          "_",
          " "
        )}. Check your dashboard for details.`;
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", order.user_id)
          .single();
        if (profile?.email) {
          await sendEmailNotification(
            profile.email,
            `Order Status Update - Order #${id}`,
            `
                <h2>Order Status Update</h2>
                <p>Your order (ID: ${id}) is now ${newStatus.replace(
              "_",
              " "
            )}.</p>
                <p>Please check the app for more details: vianclothinghub.com.ng</p>
              `
          );
        }
        await createInAppNotification(order.user_id, notificationText);
      }
    }
  }

  const updateCustomOrderDeliveryStatus = async (id, newDeliveryStatus) => {
    const { error, data } = await supabase
      .from("custom_orders")
      .update({ delivery_status: newDeliveryStatus })
      .eq("id", id)
      .select("*, profiles(email)")
      .single();

    if (error) {
      console.error("Error updating delivery status:", error.message);
      toast.error("Error updating delivery status: " + error.message);
      return;
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, delivery_status: newDeliveryStatus } : order
      )
    );

    const order = data;
    const notificationText = `Your custom order (ID: ${order.id}) delivery status updated to ${newDeliveryStatus.replace('_', ' ')}. Check dashboard for details.`;
    await sendWhatsAppNotification(order.phone, notificationText);

    const email = order.profiles?.email || order.email;
    if (email) {
      const emailBody = `
        <h2>Delivery Status Update</h2>
        <p>Your custom order (ID: ${order.id}) is now ${newDeliveryStatus.replace('_', ' ')}.</p>
        <p>View details: <a href="https://vianclothinghub.com.ng/dashboard">Dashboard</a></p>
      `;
      await sendEmailNotification(email, "Custom Order Delivery Update", emailBody);
    }

    await createInAppNotification(order.user_id, notificationText);
  };

  if (loading) return <DressLoader />;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <main className="min-h-screen bg-gray-50">
      <ToastContainer />

      <Navbar profile={profile} notifications={notifications} />
      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 min-h-screen left-0 w-64 bg-white shadow-lg p-6 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:static lg:translate-x-0 transition-transform duration-300 z-50`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-purple-800">Admin Dashboard</h2>
            <button className="lg:hidden text-gray-600" onClick={() => setIsSidebarOpen(false)}>
              <FaBars />
            </button>
          </div>
          <nav className="space-y-2">
            {[
              { id: "overview", label: "Overview", icon: <FaUser /> },
              { id: "notifications", label: "Notifications", icon: <FaBell /> },
              { id: "profile", label: "Profile", icon: <FaUser /> },
              { id: "add-product", label: "Add Product", icon: <FaTshirt /> },
              { id: "shipping-fees", label: "Shipping Fees", icon: <FaShippingFast /> },
              { id: "products", label: "Products", icon: <FaTshirt /> },
              { id: "custom-orders", label: "Custom Orders", icon: <FaBox /> },
              { id: "product-orders", label: "Product Orders", icon: <FaBox /> },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-2 p-3 rounded-lg text-left transition-colors ${activeSection === item.id
                    ? "bg-purple-100 text-purple-800"
                    : "text-gray-600 hover:bg-purple-50 hover:text-purple-800"
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="w-full flex items-center space-x-2 p-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <FaSignOutAlt />
              <span>Log Out</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 container mx-auto px-4 py-8 max-w-8xl">
          <button
            className="lg:hidden mb-4 text-purple-600"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars size={24} />
          </button>

          {/* Overview Section */}
          {activeSection === "overview" && (
            <section className="bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-2xl p-6 mb-6 shadow-lg">
              <h1 className="text-2xl md:text-3xl font-bold">
                Welcome, {profile?.email.split("@")[0]}!
              </h1>
              <p className="mt-2">Manage your products, orders, and shipping fees with ease.</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white text-purple-800 p-4 rounded-lg shadow">
                  <p className="text-lg font-semibold">{products.length}</p>
                  <p className="text-sm">Total Products</p>
                </div>
                <div className="bg-white text-purple-800 p-4 rounded-lg shadow">
                  <p className="text-lg font-semibold">{orders.length}</p>
                  <p className="text-sm">Custom Orders</p>
                </div>
                <div className="bg-white text-purple-800 p-4 rounded-lg shadow">
                  <p className="text-lg font-semibold">{productOrders.length}</p>
                  <p className="text-sm">Product Orders</p>
                </div>
              </div>
            </section>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-purple-800 mb-4">Notifications</h2>
              <button
                onClick={markAllNotificationsAsRead}
                className="mb-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                disabled={notifications.every((notif) => notif.read)}
              >
                Mark All as Read
              </button>
              {notifications.length === 0 ? (
                <p className="text-gray-500">No notifications available.</p>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((notif) => (
                    <li
                      key={notif.id}
                      className={`p-4 rounded-lg border transition-all duration-300 ${notif.read ? "bg-gray-100 border-gray-200" : "bg-purple-50 border-purple-200"
                        } hover:shadow-md`}
                    >
                      <p className="text-gray-700">{notif.message}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                      {!notif.read && (
                        <button
                          onClick={() => markNotificationAsRead(notif.id)}
                          className="mt-2 text-sm text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          Mark as Read
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Profile Section */}
          {activeSection === "profile" && (
            <section className="rounded-2xl shadow-lg p-6 mb-6">
              <ProfileSection profile={profile} setProfile={setProfile} user={user} />
            </section>
          )}

          {/* Add Product Section */}
          {activeSection === "add-product" && (
            <section className="rounded-2xl shadow-lg p-6 mb-6">
              <AddProductForm
                products={products}
                setProducts={setProducts}
                categories={categories}
                setCategories={setCategories}
              />
            </section>
          )}

          {/* Shipping Fees Section */}
          {activeSection === "shipping-fees" && (
            <section className="rounded-2xl shadow-lg p-6 mb-6">
              <ShippingFeesTable
                shippingFees={shippingFees}
                setShippingFees={setShippingFees}
              />
            </section>
          )}

          {/* Products Section */}
          {activeSection === "products" && (
            <section className="rounded-2xl shadow-lg p-6 mb-6">
              <ProductsTable
                products={products}
                setProducts={setProducts}
                categories={categories}
                setCategories={setCategories}
                variants={variants}
                setVariants={setVariants}
                itemsPerPage={itemsPerPage}
                currentProductPage={currentProductPage}
                setCurrentProductPage={setCurrentProductPage}
              />
            </section>
          )}

          {/* Custom Orders Section */}
          {activeSection === "custom-orders" && (
            <section className="rounded-2xl shadow-lg p-6 mb-6">
              <CustomOrdersTable
                orders={orders}
                setOrders={setOrders}
                itemsPerPage={itemsPerPage}
                currentCustomOrderPage={currentCustomOrderPage}
                setCurrentCustomOrderPage={setCurrentCustomOrderPage}
                updateCustomOrderStatus={updateCustomOrderStatus}
                updateCustomOrderDeliveryStatus={updateCustomOrderDeliveryStatus}
                orderPrices={orderPrices}
                setOrderPrices={setOrderPrices}
              />
            </section>
          )}

          {/* Product Orders Section */}
          {activeSection === "product-orders" && (
            <section className="rounded-2xl shadow-lg p-6 mb-6">
              <ProductOrdersTable
                productOrders={productOrders}
                setProductOrders={setProductOrders}
                itemsPerPage={itemsPerPage}
                currentProductOrderPage={currentProductOrderPage}
                setCurrentProductOrderPage={setCurrentProductOrderPage}
                updateProductOrderStatus={updateProductOrderStatus}
              />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}