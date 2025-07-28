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
      try {
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
      } catch (err) {
        setError("Failed to load profile: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  const initiatePayment = async (formData, callback) => {
    if (!window.PaystackPop) {
      setError('Paystack SDK not loaded. Please try again later.');
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
            setError('Payment verification failed. Please contact support.');
            return;
          }
          await callback(response.reference);
        } catch (err) {
          setError('Payment processing failed: ' + err.message);
        }
      },
      onClose: () => {
        setError('Payment cancelled. You can try again or contact support.');
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
        alert('Payment successful! Custom order placed successfully.');
        router.push('/dashboard');
      } catch (err) {
        setError('Order submission failed: ' + err.message);
      }
    };

    await initiatePayment(formData, submitOrder);
  };

  if (loading) return <DressLoader />;
  if (error) return (
    <div className="p-6 text-center text-red-600 bg-red-100 rounded-lg mx-auto max-w-2xl my-10">
      <p>Error: {error}</p>
      <button
        onClick={() => router.push('/auth')}
        className="mt-4 bg-purple-700 text-white py-2 px-4 rounded hover:bg-purple-800"
      >
        Go to Login
      </button>
    </div>
  );

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
      <main className="min-h-screen bg-gray-50">
        <Navbar profile={profile} />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-center mb-8 text-purple-800">
            Design Your Dream Outfit
          </h1>
          <CustomOrderForm onSubmit={handleFormSubmit} />
        </div>
        <Footer />
      </main>
    </>
  );
}