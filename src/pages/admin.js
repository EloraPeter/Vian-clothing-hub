import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import Navbar from "@/components/Navbar";
import DressLoader from "@/components/DressLoader";
import { colorMap } from "@/lib/colorMap";
import ProfileSection from "@/components/admin/ProfileSection";
import AddProductForm from "@/components/admin/AddProductForm";
import ProductsTable from "@/components/admin/ProductsTable";
import VariantsModal from "@/components/admin/VariantsModal"; // Note: This is used inside ProductsTable if needed; adjust if separate section
import ShippingFeesTable from "@/components/admin/ShippingFeesTable";
import CustomOrdersTable from "@/components/admin/CustomOrdersTable";
import ProductOrdersTable from "@/components/admin/ProductOrdersTable";

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
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [currentCustomOrderPage, setCurrentCustomOrderPage] = useState(1);
  const [currentProductOrderPage, setCurrentProductOrderPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [orderPrices, setOrderPrices] = useState({});
  const [discountInputs, setDiscountInputs] = useState({});

  // useEffects for auth and fetching (unchanged from original)
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
        ] = await Promise.all([
          supabase.from("custom_orders").select("*").order("created_at", { ascending: false }),
          supabase.from("orders").select("*, items").order("created_at", { ascending: false }),
          supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
          supabase.from("categories").select("id, name, slug"),
          supabase.from("product_variants").select("id, product_id, size, color, stock_quantity, additional_price"),
          supabase.from("shipping_fees").select("id, state_name, shipping_fee"),
        ]);

        // Error handling and setting state (unchanged)
        // ...
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }

    fetchProfile();
    fetchData();
  }, [user]);

  // Notification and PDF functions (unchanged, but added new delivery status handler)
  const sendWhatsAppNotification = async (phone, text) => {
    // Unchanged
  };

  const sendEmailNotification = async (email, subject, body) => {
    // Unchanged
  };

  const createInAppNotification = async (userId, message) => {
    // Unchanged
  };

  const generateInvoicePDF = async (order, amount, userId, email) => {
    // Unchanged (long function)
  };

  const updateCustomOrderStatus = async (id, newStatus) => {
    // Unchanged
  };

  const updateProductOrderStatus = async (id, newStatus) => {
    // Unchanged (add if missing from original)
  };

  // New: Handler for delivery_status updates
  const updateCustomOrderDeliveryStatus = async (id, newDeliveryStatus) => {
    const { error, data } = await supabase
      .from("custom_orders")
      .update({ delivery_status: newDeliveryStatus })
      .eq("id", id)
      .select("*, profiles(email)")
      .single();

    if (error) {
      console.error("Error updating delivery status:", error.message);
      alert("Error updating delivery status: " + error.message);
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
      <Navbar profile={profile} />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-purple-800 mb-8 text-center">Admin Dashboard</h1>

        <ProfileSection profile={profile} setProfile={setProfile} user={user} />
        <AddProductForm products={products} setProducts={setProducts} categories={categories} setCategories={setCategories} />
        <ProductsTable 
          products={products} setProducts={setProducts} categories={categories} setCategories={setCategories} 
          variants={variants} setVariants={setVariants} itemsPerPage={itemsPerPage} 
          currentProductPage={currentProductPage} setCurrentProductPage={setCurrentProductPage} 
        />
        <ShippingFeesTable shippingFees={shippingFees} setShippingFees={setShippingFees} />
        <CustomOrdersTable 
          orders={orders} setOrders={setOrders} itemsPerPage={itemsPerPage} 
          currentCustomOrderPage={currentCustomOrderPage} setCurrentCustomOrderPage={setCurrentCustomOrderPage} 
          updateCustomOrderStatus={updateCustomOrderStatus} updateCustomOrderDeliveryStatus={updateCustomOrderDeliveryStatus} 
          orderPrices={orderPrices} setOrderPrices={setOrderPrices} 
        />
        <ProductOrdersTable 
          productOrders={productOrders} setProductOrders={setProductOrders} itemsPerPage={itemsPerPage} 
          currentProductOrderPage={currentProductOrderPage} setCurrentProductOrderPage={setCurrentProductOrderPage} 
          updateProductOrderStatus={updateProductOrderStatus} 
        />

        <div className="text-center mt-8">
          <button
            className="bg-red-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-red-700 transition-colors"
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </main>
  );
}