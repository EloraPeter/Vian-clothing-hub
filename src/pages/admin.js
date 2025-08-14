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
import { FaUser, FaBox, FaShippingFast, FaTshirt, FaSignOutAlt, FaBars, FaBell, FaEnvelope } from "react-icons/fa";
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
  const [contactInquiries, setContactInquiries] = useState([]);
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
        .select("email, avatar_url, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setError(error.message);
        toast.error("Error fetching profile: " + error.message);
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
          { data: contactInquiriesData, error: contactInquiriesError },
        ] = await Promise.all([
          // Fetch custom orders with all customer details
          supabase.from("custom_orders").select(`
            id,
            user_id,
            full_name,
            phone,
            email,
            address,
            fabric,
            style,
            price,
            status,
            delivery_status
          `).order("created_at", { ascending: false }),
          // Fetch product orders with customer details and join profiles for email
          supabase.from("orders").select(`
            id,
            user_id,
            full_name,
            phone_number,
            address,
            items,
            total,
            status,
            profiles (
              email
            )
          `).order("created_at", { ascending: false }),
          supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
          supabase.from("categories").select("id, name, slug"),
          supabase.from("product_variants").select("id, product_id, size, color, stock_quantity, additional_price"),
          supabase.from("shipping_fees").select("id, state_name, shipping_fee"),
          supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("contact_inquiries").select("id, name, email, subject, message, phone, read, created_at").order("created_at", { ascending: false }),
        ]);

        if (customOrderError) {
          setError(customOrderError.message);
          toast.error("Error fetching custom orders: " + customOrderError.message);
        } else {
          // Map custom orders to include customer details
          setOrders(customOrderData.map(order => ({
            ...order,
            customer: {
              full_name: order.full_name || "N/A",
              phone: order.phone || "N/A",
              email: order.email || "N/A",
              address: order.address || "N/A"
            }
          })) || []);
        }

        if (productOrderError) {
          setError(productOrderError.message);
          toast.error("Error fetching product orders: " + productOrderError.message);
        } else {
          // Map product orders to include customer details
          setProductOrders(productOrderData.map(order => ({
            ...order,
            customer: {
              full_name: order.full_name || "N/A",
              phone: order.phone_number || "N/A",
              email: order.profiles?.email || "N/A",
              address: order.address || "N/A"
            }
          })) || []);
        }

        if (productError) {
          setError(productError.message);
          toast.error("Error fetching products: " + productError.message);
        } else {
          setProducts(productData || []);
        }

        if (categoryError) {
          setError(categoryError.message);
          toast.error("Error fetching categories: " + categoryError.message);
        } else {
          setCategories(categoryData || []);
        }

        if (variantsError) {
          setError(variantsError.message);
          toast.error("Error fetching variants: " + variantsError.message);
        } else {
          const variantsByProduct = {};
          variantsData.forEach((variant) => {
            if (!variantsByProduct[variant.product_id]) {
              variantsByProduct[variant.product_id] = [];
            }
            variantsByProduct[variant.product_id].push(variant);
          });
          setVariants(variantsByProduct);
        }

        if (shippingFeesError) {
          setError(shippingFeesError.message);
          toast.error("Error fetching shipping fees: " + shippingFeesError.message);
        } else {
          setShippingFees(shippingFeesData || []);
        }

        if (notificationsError) {
          setError(notificationsError.message);
          toast.error("Error fetching notifications: " + notificationsError.message);
        } else {
          setNotifications(notificationsData || []);
        }

        if (contactInquiriesError) {
          setError(contactInquiriesError.message);
          toast.error("Error fetching contact inquiries: " + contactInquiriesError.message);
        } else {
          setContactInquiries(contactInquiriesData || []);
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        toast.error("Error fetching data: " + err.message);
        setLoading(false);
      }
    }

    // Subscribe to real-time contact inquiries
    const subscription = supabase
      .channel("contact_inquiries_channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contact_inquiries" },
        (payload) => {
          setContactInquiries((prev) => [{ ...payload.new, read: payload.new.read ?? false }, ...prev]);
          createInAppNotification(
            user.id,
            `New contact inquiry from ${payload.new.name}: ${payload.new.subject}`
          );
          toast.info(`New inquiry from ${payload.new.name}`);
        }
      )
      .subscribe();

    fetchProfile();
    fetchData();

    return () => {
      supabase.removeChannel(subscription);
    };
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
      toast.success("Notification marked as read.");
    } else {
      toast.error("Error marking notification as read: " + error.message);
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
      toast.error("Error marking all notifications as read: " + error.message);
    }
  };

  const markInquiryAsRead = async (inquiryId) => {
    const { error } = await supabase
      .from("contact_inquiries")
      .update({ read: true })
      .eq("id", inquiryId);
    if (!error) {
      setContactInquiries((prev) =>
        prev.map((inquiry) =>
          inquiry.id === inquiryId ? { ...inquiry, read: true } : inquiry
        )
      );
      toast.success("Inquiry marked as read.");
    } else {
      toast.error("Error marking inquiry as read: " + error.message);
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
        toast.error("Failed to send WhatsApp message: " + response.statusText);
        return false;
      }
      toast.success("WhatsApp message sent successfully.");
      return true;
    } catch (error) {
      toast.error("Error sending WhatsApp message: " + error.message);
      return false;
    }
  };

  const sendEmailNotification = async (email, subject, body) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, subject, html: body }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error("Failed to send email: " + result.error);
        return false;
      }
      toast.success(`Email sent successfully to ${email}.`);

      return true;
    } catch (error) {
      toast.error("Error sending email: " + error.message);
      return false;
    }
  };

  const createInAppNotification = async (userId, message) => {
    const { error } = await supabase
      .from("notifications")
      .insert({ user_id: userId, message, read: false });
    if (error) {
      toast.error("Error creating notification: " + error.message);
    }
  };

  const handleReplyEmail = async (inquiry) => {
    const subject = `Re: ${inquiry.subject}`;
    const body = `Dear ${inquiry.name},\n\nThank you for your inquiry. [Your response here]\n\nBest regards,\n[Your Company Name]`;
    await sendEmailNotification(inquiry.email, subject, body);
  };

  const handleReplyWhatsApp = async (inquiry) => {
    if (!inquiry.phone) {
      toast.error("No phone number provided for WhatsApp reply.");
      return;
    }
    const text = `Dear ${inquiry.name}, thank you for your inquiry about "${inquiry.subject}". [Your response here]`;
    await sendWhatsAppNotification(inquiry.phone, text);
  };

  if (loading) {
    return <DressLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Access Denied: You are not an admin.</p>
      </div>
    );
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <ToastContainer />
      <Navbar user={user} profile={profile} />
      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 w-64 bg-purple-800 text-white transform transition-transform duration-300 ease-in-out z-50 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } md:relative md:translate-x-0 md:shadow-lg`}
        >
          <div className="flex items-center justify-between p-4 border-b border-purple-700">
            <h2 className="text-lg font-semibold">Admin Dashboard</h2>
            <button onClick={toggleSidebar} className="md:hidden text-white">
              <FaBars size={24} />
            </button>
          </div>
          <nav className="mt-4">
            <ul className="space-y-2">
              {[
                { name: "Overview", section: "overview", icon: <FaUser /> },
                { name: "Profile", section: "profile", icon: <FaUser /> },
                { name: "Add Product", section: "add-product", icon: <FaBox /> },
                { name: "Products", section: "products", icon: <FaTshirt /> },
                { name: "Custom Orders", section: "custom-orders", icon: <FaTshirt /> },
                { name: "Product Orders", section: "product-orders", icon: <FaBox /> },
                { name: "Shipping Fees", section: "shipping-fees", icon: <FaShippingFast /> },
                {
                  name: "Notifications",
                  section: "notifications",
                  icon: <FaBell />,
                  count: notifications.filter((n) => !n.read).length,
                },
                {
                  name: "Contact Inquiries",
                  section: "contact-inquiries",
                  icon: <FaEnvelope />,
                  count: contactInquiries.filter((i) => !i.read).length,
                },
                { name: "Sign Out", section: "sign-out", icon: <FaSignOutAlt /> },
              ].map((item) => (
                <li key={item.section}>
                  <button
                    onClick={() => {
                      if (item.section === "sign-out") {
                        supabase.auth.signOut().then(() => router.push("/"));
                      } else {
                        setActiveSection(item.section);
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={`flex items-center w-full px-4 py-2 text-left hover:bg-purple-700 transition-colors ${activeSection === item.section ? "bg-purple-900" : ""
                      }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span>{item.name}</span>
                    {item.count > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                        {item.count}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="flex-1 p-6 md:ml-64">
          <button
            onClick={toggleSidebar}
            className="md:hidden mb-4 p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <FaBars size={24} />
          </button>

          {activeSection === "overview" && (
            <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h1 className="text-2xl font-bold text-purple-800">
                Welcome, {profile?.email.split("@")[0].replace(/\b\w/g, (char) => char.toUpperCase())}!
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
                      className={`p-4 rounded-lg border transition-all duration-300 ${notif.read ? "bg-gray-100 border-gray-200" : "bg-purple-50 border-purple-200"} hover:shadow-md`}
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

          {activeSection === "profile" && (
            <section className="rounded-2xl shadow-lg p-6 mb-6">
              <ProfileSection profile={profile} setProfile={setProfile} user={user} />
            </section>
          )}

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

          {activeSection === "shipping-fees" && (
            <section className="rounded-2xl shadow-lg p-6 mb-6">
              <ShippingFeesTable
                shippingFees={shippingFees}
                setShippingFees={setShippingFees}
              />
            </section>
          )}

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

          {activeSection === "contact-inquiries" && (
            <section className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-purple-800 mb-4">Contact Inquiries</h2>
              {contactInquiries.length === 0 ? (
                <p className="text-gray-500">No contact inquiries available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead>
                      <tr className="bg-purple-100">
                        <th className="py-2 px-4 border-b text-left text-purple-800">ID</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Name</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Email</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Phone</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Subject</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Message</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Created At</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Status</th>
                        <th className="py-2 px-4 border-b text-left text-purple-800">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactInquiries.map((inquiry) => (
                        <tr key={inquiry.id} className={`hover:bg-purple-50 ${inquiry.read ? "bg-gray-50" : "bg-purple-50"}`}>
                          <td className="py-2 px-4 border-b text-gray-700">{inquiry.id}</td>
                          <td className="py-2 px-4 border-b text-gray-700">{inquiry.name}</td>
                          <td className="py-2 px-4 border-b text-gray-700">{inquiry.email}</td>
                          <td className="py-2 px-4 border-b text-gray-700">{inquiry.phone || "N/A"}</td>
                          <td className="py-2 px-4 border-b text-gray-700">{inquiry.subject}</td>
                          <td className="py-2 px-4 border-b text-gray-700">{inquiry.message}</td>
                          <td className="py-2 px-4 border-b text-gray-700">
                            {new Date(inquiry.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 px-4 border-b text-gray-700">
                            {inquiry.read ? "Read" : "Unread"}
                          </td>
                          <td className="py-2 px-4 border-b text-gray-700">
                            <div className="flex space-x-2">
                              {!inquiry.read && (
                                <button
                                  onClick={() => markInquiryAsRead(inquiry.id)}
                                  className="text-sm text-purple-600 hover:text-purple-800"
                                >
                                  Mark as Read
                                </button>
                              )}
                              <button
                                onClick={() => handleReplyEmail(inquiry)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                Reply via Email
                              </button>
                              <button
                                onClick={() => handleReplyWhatsApp(inquiry)}
                                className="text-sm text-green-600 hover:text-green-800"
                              >
                                Reply via WhatsApp
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}