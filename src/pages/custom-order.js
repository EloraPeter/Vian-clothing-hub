import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import { useCart } from "@/context/CartContext";
import CustomOrderForm from '@/components/CustomOrderForm';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import DressLoader from '@/components/DressLoader';
import Head from "next/head";
import Script from "next/script";

export default function CustomOrderPage() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User fetch error or no user:", userError?.message || "No user");
        router.push("/auth");
        return;
      }

      setUser(user);
      console.log("Fetching profile for user ID:", user.id);
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError.message);
        setError(profileError.message);
        setProfile(null);
      } else {
        console.log("Profile data:", profileData);
        setProfile(profileData || { email: user.email, avatar_url: null });
      }
      setLoading(false);
    }
    fetchProfile();
  }, [router]);

  const initiatePayment = async (formData, callback) => {
    if (!window.PaystackPop) {
      setError('Paystack SDK not loaded.');
      return;
    }

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: profile?.email || user.email,
      amount: 5000 * 100, // ₦5,000 in kobo
      currency: 'NGN',
      ref: `VIAN_CUSTOM_${Date.now()}`,
      callback: async (response) => {
        try {
          const { error, data } = await supabase.functions.invoke('verify-paystack-payment', {
            body: { reference: response.reference },
          });
          if (error || !data.success) {
            setError('Payment verification failed.');
            return;
          }
          await callback(response.reference);
        } catch (err) {
          setError('Payment processing failed: ' + err.message);
        }
      },
      onClose: () => {
        setError('Payment cancelled.');
      },
    });
    handler.openIframe();
  };

  const handleFormSubmit = async (formData) => {
    if (!user) {
      setError('You must be logged in to place an order.');
      return;
    }

    const submitOrder = async (paymentReference) => {
      try {
        const { error } = await supabase.from('custom_orders').insert([
          {
            user_id: user.id,
            full_name: formData.full_name,
            phone: formData.phone,
            email: formData.email,
            fabric: formData.fabric,
            style: formData.style,
            measurements: formData.measurements,
            additional_notes: formData.additional_notes,
            address: formData.address,
            deposit: 5000,
            status: 'pending',
            created_at: new Date().toISOString(),
            payment_reference: paymentReference,
          },
        ]);
        if (error) throw error;
        alert('Payment successful! Custom order placed.');
        router.push('/dashboard');
      } catch (err) {
        setError('Order failed: ' + err.message);
      }
    };

    await initiatePayment(formData, submitOrder);
  };

  if (loading) return <DressLoader />;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
      <Head>
        <title>Custom Order - Vian Clothing Hub</title>
        <meta
          name="description"
          content="Create a personalized fashion order at Vian Clothing Hub. Choose your style, fabric, and specifications for a unique outfit made just for you."
        />
        <meta name="keywords" content="custom fashion order, Vian Clothing Hub, tailored outfits, custom clothing Nigeria" />
        <meta name="author" content="Vian Clothing Hub" />
        <meta property="og:title" content="Custom Order - Vian Clothing Hub" />
        <meta property="og:description" content="Submit your custom clothing order with Vian Clothing Hub and bring your fashion vision to life." />
      </Head>
      <main className="min-h-screen mb-0 bg-gray-100 pb-0">
        <Navbar profile={profile} />
        <div className="">
          <h1 className="text-3xl font-bold pt-4 text-center mb-6 text-purple-700">
            Custom Order Form
          </h1>
          <CustomOrderForm onSubmit={handleFormSubmit} />
          {error && <p className="text-red-600 text-center mt-4">{error}</p>}
        </div>
        <Footer />
      </main>
    </>
  );
}