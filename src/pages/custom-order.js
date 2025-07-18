import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import CustomOrderForm from '@/components/CustomOrderForm';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';


export default function CustomOrderPage() {
  const [profile, setProfile] = useState(null);


  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (!profileError) setProfile(profileData);
        else console.error("Profile fetch error:", profileError.message);
      } else if (userError) console.error("User fetch error:", userError.message);
    }
    fetchProfile();
  }, []);

  return (
    <main className="min-h-screen mb-0 bg-gray-100 pb-0">
      <Navbar profile={profile} />
      <div >
        <h1 className="text-3xl font-bold text-center mb-6 text-purple-700">
          Custom Order Form
        </h1>
        <CustomOrderForm />
      </div>
      <Footer />

    </main >

  );
}
