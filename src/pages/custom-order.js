import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import { useCart } from "@/context/CartContext";
import CustomOrderForm from '@/components/CustomOrderForm';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import DressLoader from '@/components/DressLoader';
import Head from "next/head";




export default function CustomOrderPage() {
  const [profile, setProfile] = useState(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);



  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User fetch error or no user:", userError?.message || "No user");
        router.push("/auth");
        return;
      }

      console.log("Fetching profile for user ID:", user.id);
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError.message);
        setProfile(null);
      } else {
        console.log("Profile data:", profileData);
        setProfile(profileData || null);
      }
    }
    fetchProfile();
  }, [router]);

  if (loading) return <DressLoader />;

  return (
    <>
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
        <CustomOrderForm />
      </div>
      <Footer />

    </main >
    </>

  );
}
