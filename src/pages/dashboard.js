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

  // Password visibility toggles
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Password strength meter state
  const [newPassword, setNewPassword] = useState('');
  const [strengthScore, setStrengthScore] = useState(0);

  // Avatar states
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleNewPasswordChange = (e) => {
    const val = e.target.value;
    setNewPassword(val);
    setStrengthScore(zxcvbn(val).score);
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        router.push('/auth');
      } else {
        setUser(session.user);
      }
    });
    return () => authListener.subscription?.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch profile info
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email, avatar_url, is_admin')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;
        setProfile(profileData || { email: user.email, avatar_url: null, is_admin: false });

        // Fetch custom orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('custom_orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (ordersError) throw ordersError;
        setOrders(ordersData);

        // Fetch ready-made product orders
        const { data: productOrdersData, error: productOrdersError } = await supabase
          .from('orders')
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

  const handleAvatarChange = async () => {
    if (!avatarFile) return;

    setUploading(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        throw new Error('Upload failed: ' + uploadError.message);
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatar_url = data.publicUrl;

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: profile.email, avatar_url, is_admin: profile.is_admin });

      if (error) {
        throw new Error('Profile update failed: ' + error.message);
      }

      setProfile((prev) => ({ ...prev, avatar_url }));
      setPreviewUrl(null);
      setAvatarFile(null);
      alert('Profile picture updated successfully');
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) return <p className="p-6 text-center text-gray-600">Loading...</p>;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-10">
      <Navbar profile={profile} />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-4xl font-extrabold mb-8 text-purple-800 text-center tracking-tight">
          Customer Dashboard
        </h1>

        {/* Profile Picture Section */}
        <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl max-w-lg mx-auto transform hover:scale-[1.02] transition-transform duration-300">
          <h2 className="text-2xl font-bold text-purple-800 mb-6">Update Profile Picture</h2>
          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              {previewUrl || profile?.avatar_url ? (
                <img
                  src={previewUrl || profile.avatar_url}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-purple-200 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium shadow-md">
                  No Picture
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              )}
            </div>
            <label className="w-full max-w-xs">
              <span className="block text-sm font-medium text-gray-700 mb-2">Choose New Picture</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setAvatarFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
                disabled={uploading}
              />
            </label>
            <button
              onClick={handleAvatarChange}
              disabled={uploading || !avatarFile}
              className={`w-full max-w-xs py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
                uploading || !avatarFile
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {uploading ? 'Uploading...' : 'Update Picture'}
            </button>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="mb-12 bg-white p-8 rounded-2xl shadow-xl max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-purple-800 mb-6">Change Password</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const oldPassword = e.target.old_password.value;
              const newPassword = e.target.new_password.value;

              try {
                const {
                  data: { session },
                } = await supabase.auth.getSession();

                const email = session?.user?.email;
                if (!email) {
                  throw new Error("You're not logged in.");
                }

                // Reauthenticate
                const { error: signInError } = await supabase.auth.signInWithPassword({
                  email,
                  password: oldPassword,
                });

                if (signInError) {
                  throw new Error('Old password is incorrect.');
                }

                // Update password
                const { error: updateError } = await supabase.auth.updateUser({
                  password: newPassword,
                });

                if (updateError) {
                  throw new Error('Password update failed: ' + updateError.message);
                }

                alert('Password updated successfully!');
                e.target.reset();
                setNewPassword('');
                setStrengthScore(0);
              } catch (error) {
                alert(error.message);
              }
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Old Password</label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  name="old_password"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter old password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 text-sm"
                >
                  {showOldPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  name="new_password"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 text-sm"
                >
                  {showNewPass ? 'Hide' : 'Show'}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: ['#ef4444', '#f97316', '#facc15', '#4ade80', '#22c55e'][strengthScore] }}
                  >
                    Password Strength: {['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore]}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(strengthScore + 1) * 20}%`,
                        backgroundColor: ['#ef4444', '#f97316', '#facc15', '#4ade80', '#22c55e'][strengthScore],
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 transition-colors shadow-md"
            >
              Change Password
            </button>
          </form>
        </div>

        {/* Wishlist Section */}
        <section className="mb-12 bg-white p-6 rounded-2xl shadow-xl">
          <h2 className="font-semibold text-xl text-gray-800 mb-4">Wishlist</h2>
          {wishlist.length === 0 ? (
            <p className="text-gray-600">You have no items in your wishlist.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {wishlist.map((item) => (
                <div key={item.id} className="bg-gray-50 p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                  <img src={item.image_url} alt={item.name} className="h-32 w-full object-cover rounded-md mb-2" />
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">₦{item.price}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Custom Orders Section */}
        <section className="mb-12 bg-white p-6 rounded-2xl shadow-xl">
          <h2 className="font-semibold text-xl text-gray-800 mb-4">Custom Orders</h2>
          {orders.length === 0 ? (
            <p className="text-gray-600">You have no custom orders yet.</p>
          ) : (
            <ul className="space-y-4">
              {orders.map((order) => (
                <li key={order.id} className="border p-4 rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p><strong>Fabric:</strong> {order.fabric}</p>
                    <p><strong>Style:</strong> {order.style}</p>
                    <p><strong>Status:</strong> {order.status}</p>
                    <p><strong>Ordered on:</strong> {new Date(order.created_at).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Product Orders Section */}
        <section className="mb-12 bg-white p-6 rounded-2xl shadow-xl">
          <h2 className="font-semibold text-xl text-gray-800 mb-4">Product Purchase History</h2>
          {productOrders.length === 0 ? (
            <p className="text-gray-600">You haven't purchased any products yet.</p>
          ) : (
            <ul className="space-y-4">
              {productOrders.map((order) => (
                <li key={order.id} className="border p-4 rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <p><strong>Items:</strong> {order.items.map((i) => i.name).join(', ')}</p>
                    <p><strong>Total:</strong> ₦{order.total}</p>
                    <p><strong>Status:</strong> {order.status}</p>
                    <p><strong>Placed:</strong> {new Date(order.created_at).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-8 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md"
        >
          Log Out
        </button>
      </div>
    </main>
  );
}