import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import { useWishlist } from '@/context/WishlistContext';
import zxcvbn from 'zxcvbn';



export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [productOrders, setProductOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { wishlist } = useWishlist();

  // Check session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth');
      } else {
        setUser(data.session.user);
      }
    });
  }, [router]);

  // Fetch everything after user loads
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch profile info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email, is_admin')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch custom orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('custom_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (ordersError) throw ordersError;
        setOrders(ordersData);

        // Fetch ready-made product orders (if applicable)
        const { data: productOrdersData, error: productOrdersError } = await supabase
          .from('orders') // assuming this table
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (productOrdersError) throw productOrdersError;
        setProductOrders(productOrdersData);
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
    <main className="min-h-screen bg-gray-100 pb-10">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Customer Dashboard</h1>

        {/* Profile Section */}
        <div className="mb-8 bg-white p-6 rounded-xl shadow-md max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Update Profile</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const { error } = await supabase
                .from('profiles')
                .update({ email: profile.email })
                .eq('id', user.id);

              if (error) alert('Update failed: ' + error.message);
              else alert('Profile updated successfully');
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={profile?.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 text-white font-semibold py-2 rounded-md hover:bg-purple-700 transition"
            >
              Save Changes
            </button>
          </form>
        </div>

        <div className="mb-8 bg-white p-6 rounded-xl shadow-md max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Change Password</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const oldPassword = e.target.old_password.value;
              const newPassword = e.target.new_password.value;

              const {
                data: { session },
              } = await supabase.auth.getSession();

              const email = session?.user?.email;

              if (!email) {
                alert("You're not logged in.");
                return;
              }

              // 1. Reauthenticate with old password
              const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: oldPassword,
              });

              if (signInError) {
                alert('Old password is incorrect.');
                return;
              }

              // 2. If successful, update to new password
              const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
              });

              if (updateError) {
                alert('Password update failed: ' + updateError.message);
              } else {
                alert('Password updated successfully!');
                e.target.reset();
              }
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
              <input
                type="password"
                name="old_password"
                required
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter old password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                name="new_password"
                required
                minLength={6}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter new password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white font-semibold py-2 rounded-md hover:bg-gray-900 transition"
            >
              Change Password
            </button>
          </form>
        </div>






        {/* Wishlist Section */}
        <section className="mb-8 bg-white p-4 rounded shadow">
          <h2 className="font-semibold text-xl mb-4">Wishlist</h2>
          {wishlist.length === 0 ? (
            <p>You have no items in your wishlist.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {wishlist.map((item) => (
                <div key={item.id} className="bg-gray-50 p-3 rounded shadow text-center">
                  <img src={item.image_url} alt={item.name} className="h-32 w-full object-cover rounded mb-2" />
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">₦{item.price}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Custom Orders Section */}
        <section className="mb-8 bg-white p-4 rounded shadow">
          <h2 className="font-semibold text-xl mb-4">Custom Orders</h2>
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
        </section>

        {/* Product Orders (Ready-to-Wear) */}
        <section className="mb-8 bg-white p-4 rounded shadow">
          <h2 className="font-semibold text-xl mb-4">Product Purchase History</h2>
          {productOrders.length === 0 ? (
            <p>You haven't purchased any products yet.</p>
          ) : (
            <ul className="space-y-4">
              {productOrders.map((order) => (
                <li key={order.id} className="border p-4 rounded">
                  <p><strong>Items:</strong> {order.items.map((i) => i.name).join(', ')}</p>
                  <p><strong>Total:</strong> ₦{order.total}</p>
                  <p><strong>Status:</strong> {order.status}</p>
                  <p><strong>Placed:</strong> {new Date(order.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-8 bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
        >
          Log Out
        </button>
      </div>
    </main>
  );
}
