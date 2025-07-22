import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import CartPanel from '@/components/CartPanel';
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
  const { cart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Password visibility toggles
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Password strength meter state
  const [newPassword, setNewPassword] = useState('');
  const [strengthScore, setStrengthScore] = useState(0);

  const handleNewPasswordChange = (e) => {
    const val = e.target.value;
    setNewPassword(val);
    setStrengthScore(zxcvbn(val).score);
  };

  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

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
          .select('email, avatar_url, is_admin')
          .eq('id', user.id)
          .maybeSingle();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) return <p className="p-6 text-center text-gray-600">Loading...</p>;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <main className="min-h-screen bg-gray-100">
      <Navbar
        profile={profile}
        onCartClick={() => setIsCartOpen(true)}
        cartItemCount={cart.length}
      />
      <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Customer Dashboard</h1>

        {/* Profile Section */}
        <div className="mb-8 bg-white p-6 rounded-xl shadow-md max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Update Profile</h2>
          <div className="flex items-center space-x-4 mb-4">
            {previewUrl || profile?.avatar_url ? (
              <img
                src={previewUrl || profile.avatar_url}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border border-gray-300"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                No Pic
              </div>
            )}
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
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-colors"
              disabled={uploading}
            />
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              let avatar_url = profile.avatar_url;

              if (avatarFile) {
                setUploading(true);
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${user.id}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage.from('avatars').update(filePath, avatarFile);

                if (uploadError && uploadError.message.includes('The resource was not found')) {
                  const { error: firstUploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
                  if (firstUploadError) {
                    alert('Upload failed: ' + firstUploadError.message);
                    setUploading(false);
                    return;
                  }
                }

                if (uploadError) {
                  alert('Upload failed: ' + uploadError.message);
                  setUploading(false);
                  return;
                }

                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                avatar_url = data.publicUrl;
                setUploading(false);
              }

              const { error } = await supabase
                .from('profiles')
                .update({ email: profile.email, avatar_url })
                .eq('id', user.id);

              if (error) alert('Update failed: ' + error.message);
              else {
                alert('Profile updated successfully');
                setProfile({ ...profile, avatar_url });
                setAvatarFile(null);
                setPreviewUrl(null);
              }
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                value={profile?.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 text-white font-semibold py-2 rounded-md hover:bg-purple-700 transition-colors"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password Change Section */}
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

              // Reauthenticate with old password
              const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: oldPassword,
              });

              if (signInError) {
                alert('Old password is incorrect.');
                return;
              }

              // Update to new password
              const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
              });

              if (updateError) {
                alert('Password update failed: ' + updateError.message);
              } else {
                alert('Password updated successfully!');
                e.target.reset();
                setNewPassword('');
                setStrengthScore(0);
              }
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  name="old_password"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter old password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
                >
                  {showOldPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  name="new_password"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPass ? 'Hide' : 'Show'}
                </button>
              </div>

              {newPassword && (
                <p
                  className="mt-1 font-semibold"
                  style={{ color: ['#ef4444', '#f97316', '#facc15', '#4ade80', '#22c55e'][strengthScore] }}
                >
                  Password Strength: {['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore]}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 text-white font-semibold py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Change Password
            </button>
          </form>
        </div>

        {/* Wishlist Section */}
        <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Wishlist</h2>
          {wishlist.length === 0 ? (
            <p className="text-gray-600">You have no items in your wishlist.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {wishlist.map((item) => (
                <div key={item.id} className="bg-gray-50 p-3 rounded-lg shadow-sm text-center">
                  <img src={item.image_url} alt={item.name} className="h-32 w-full object-cover rounded-lg mb-2" />
                  <p className="font-medium text-gray-700">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    {item.discount_percentage > 0 ? (
                      <span>
                        <span className="text-red-600 line-through">₦{Number(item.price).toLocaleString()}</span>{' '}
                        <span className="text-green-600">
                          ₦{(item.price * (1 - item.discount_percentage / 100)).toLocaleString()}
                        </span>
                      </span>
                    ) : (
                      <span className="text-purple-700">₦{Number(item.price).toLocaleString()}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Custom Orders Section */}
        <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Custom Orders</h2>
          {orders.length === 0 ? (
            <p className="text-gray-600">You have no custom orders yet.</p>
          ) : (
            <ul className="space-y-4">
              {orders.map((order) => (
                <li key={order.id} className="border border-gray-300 p-4 rounded-lg">
                  <p className="text-gray-700"><strong>Fabric:</strong> {order.fabric}</p>
                  <p className="text-gray-700"><strong>Style:</strong> {order.style}</p>
                  <p className="text-gray-700"><strong>Status:</strong> {order.status}</p>
                  <p className="text-gray-600 text-sm">
                    <strong>Ordered on:</strong> {new Date(order.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Product Orders Section */}
        <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Product Purchase History</h2>
          {productOrders.length === 0 ? (
            <p className="text-gray-600">You haven&rsquo;t purchased any products yet.</p>
          ) : (
            <ul className="space-y-4">
              {productOrders.map((order) => (
                <li key={order.id} className="border border-gray-300 p-4 rounded-lg">
                  <p className="text-gray-700"><strong>Items:</strong> {order.items.map((i) => i.name).join(', ')}</p>
                  <p className="text-gray-700"><strong>Total:</strong> ₦{Number(order.total).toLocaleString()}</p>
                  <p className="text-gray-700"><strong>Status:</strong> {order.status}</p>
                  <p className="text-gray-600 text-sm">
                    <strong>Placed:</strong> {new Date(order.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-8 bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Log Out
        </button>
      </div>
      <Footer />

    </main>

  );
}
