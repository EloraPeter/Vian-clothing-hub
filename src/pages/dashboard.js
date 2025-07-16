import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';


export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth'); // redirect to login/signup if not logged in
      } else {
        setUser(data.session.user);
      }
    });
  }, [router]);

  // Fetch profile and orders after user is set
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch profile info
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email, is_admin')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch user's custom orders
        let { data: ordersData, error: ordersError } = await supabase
          .from('custom_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;
        setOrders(ordersData);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) return <p className="p-6 text-center">Loading...</p>;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <main className="min-h-screen bg-gray-100 p-6 max-w-4xl mx-auto">
          <Navbar />

      <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Customer Dashboard</h1>

      <div className="mb-6 bg-white p-4 rounded shadow">
        <h2 className="font-semibold text-xl mb-2">Profile Info</h2>
        <p><strong>Email:</strong> {profile?.email}</p>
        {/* Future: add profile update form here */}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold text-xl mb-4">Your Custom Orders</h2>
        {orders.length === 0 ? (
          <p>You have no custom orders yet.</p>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="border p-4 rounded">
                <p><strong>Fabric:</strong> {order.fabric}</p>
                <p><strong>Style:</strong> {order.style}</p>
                <p><strong>Status:</strong> {order.status}</p>
                <p><strong>Ordered on:</strong> {new Date(order.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="mt-8 bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
      >
        Log Out
      </button>
    </main>
  );
}
