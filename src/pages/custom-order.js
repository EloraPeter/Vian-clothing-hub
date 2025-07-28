import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
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
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("email, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile fetch error:", profileError.message);
          setError(profileError.message);
        } else {
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
          <div className="bg-purple-100 rounded-lg p-6 mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4 text-purple-800">Design Your Dream Outfit</h1>
            <p className="text-lg text-gray-700">Create a unique piece tailored to your style. A non-refundable ₦5,000 deposit is required to confirm your order.</p>
          </div>
          <CustomOrderForm user={user} profile={profile} />
        </div>
        <Footer />
      </main>
    </>
  );
}