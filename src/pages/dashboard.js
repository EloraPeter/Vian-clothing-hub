import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import CartPanel from '@/components/CartPanel';
import zxcvbn from 'zxcvbn';
import Script from 'next/script';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [productOrders, setProductOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [notifications, setNotifications] = useState([]);
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
          .select('*, products(name, image_url, price)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (productOrdersError) throw productOrdersError;
        setProductOrders(productOrdersData);

        // Fetch invoices
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('*, custom_orders(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (invoicesError) throw invoicesError;
        setInvoices(invoicesData);

        // Fetch receipts
        const { data: receiptsData, error: receiptsError } = await supabase
          .from('receipts')
          .select('*, invoices(custom_orders(*))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (receiptsError) throw receiptsError;
        setReceipts(receiptsData);

        // Fetch notifications
        const { data: notificationsData, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (notificationsError) throw notificationsError;
        setNotifications(notificationsData);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }

    fetchData();
  }, [user]);

  const markNotificationAsRead = async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (!error) {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    }
  };

  const sendEmailNotification = async (email, subject, body) => {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { to: email, subject, html: body },
    });
    if (error) {
      console.error('Error sending email:', error.message);
    }
  };

  const generateReceiptPDF = async (invoice, paymentReference) => {
    const receiptData = {
      RECEIPTID: crypto.randomUUID(),
      INVOICEID: invoice.id,
      ORDERID: invoice.order_id,
      PAYMENTREF: paymentReference,
      FULLNAME: invoice.custom_orders.full_name,
      FABRIC: invoice.custom_orders.fabric,
      STYLE: invoice.custom_orders.style,
      ADDRESS: invoice.custom_orders.address,
      DEPOSIT: Number(invoice.custom_orders.deposit || 5000).toLocaleString(),
      BALANCE: Number(invoice.amount - (invoice.custom_orders.deposit || 5000)).toLocaleString(),
      AMOUNT: Number(invoice.amount).toLocaleString(),
      DATE: new Date().toLocaleDateString(),
    };

    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: { type: 'receipt', data: receiptData },
    });

    if (error) {
      throw new Error(`Receipt PDF generation failed: ${error.message}`);
    }

    return { pdfUrl: data.pdfUrl, receiptId: receiptData.RECEIPTID };
  };

  const initiatePayment = async (invoice) => {
    if (!window.PaystackPop) {
      alert('Paystack SDK not loaded.');
      return;
    }

    const handler = window.PaystackPop.setup({
      key: 'pk_test_your_paystack_public_key', // Replace with your Paystack public key
      email: profile.email,
      amount: (invoice.amount - (invoice.custom_orders.deposit || 5000)) * 100, // Amount in kobo (excluding deposit)
      currency: 'NGN',
      ref: `VIAN_${invoice.id}_${Date.now()}`,
      callback: async (response) => {
        // Verify payment server-side
        const { error, data } = await supabase.functions.invoke('verify-paystack-payment', {
          body: { reference: response.reference },
        });
        if (error || !data.success) {
          alert('Payment verification failed.');
          return;
        }
        // Mark invoice as paid
        await supabase.from('invoices').update({ paid: true }).eq('id', invoice.id);
        // Generate receipt
        const { pdfUrl, receiptId } = await generateReceiptPDF(invoice, response.reference);
        const receiptData = {
          id: receiptId,
          invoice_id: invoice.id,
          user_id: user.id,
          amount: invoice.amount,
          payment_reference: response.reference,
          pdf_url: pdfUrl,
        };
        await supabase.from('receipts').insert([receiptData]);
        setReceipts((prev) => [receiptData, ...prev]);
        // Update delivery status
        await supabase
          .from('custom_orders')
          .update({ delivery_status: 'in_progress' })
          .eq('id', invoice.order_id);
        setOrders((prev) =>
          prev.map((order) =>
            order.id === invoice.order_id ? { ...order, delivery_status: 'in_progress' } : order
          )
        );
        // Notify user
        const notificationText = `Payment successful for order ID: ${invoice.order_id}. Delivery has started. Check your dashboard for the receipt: [Your App URL]`;
        await supabase.from('notifications').insert([
          {
            user_id: user.id,
            message: notificationText,
            created_at: new Date().toISOString(),
            read: false,
          },
        ]);
        setNotifications((prev) => [
          {
            id: Date.now(), // Temporary ID
            user_id: user.id,
            message: notificationText,
            created_at: new Date().toISOString(),
            read: false,
          },
          ...prev,
        ]);
        const emailBody = `
          <h2>Payment Confirmation</h2>
          <p>Your payment for order ID: ${invoice.order_id} has been received.</p>
          <p><strong>Receipt</strong></p>
          <p>Order ID: ${invoice.order_id}</p>
          <p>Customer: ${invoice.custom_orders.full_name}</p>
          <p>Fabric: ${invoice.custom_orders.fabric}</p>
          <p>Style: ${invoice.custom_orders.style}</p>
          <p>Delivery Address: ${invoice.custom_orders.address}</p>
          <p>Deposit: ₦${Number(invoice.custom_orders.deposit || 5000).toLocaleString()}</p>
          <p>Balance Paid: ₦${Number(invoice.amount - (invoice.custom_orders.deposit || 5000)).toLocaleString()}</p>
          <p>Total Amount: ₦${Number(invoice.amount).toLocaleString()}</p>
          <p>Payment Reference: ${response.reference}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
          <p><a href="${pdfUrl}">View/Download Receipt</a></p>
          <p>Delivery has started. Please check the app for updates: [Your App URL]</p>
        `;
        await sendEmailNotification(profile.email, 'Payment Receipt', emailBody);
        alert('Payment successful! Receipt generated and delivery started.');
      },
      onClose: () => {
        alert('Payment cancelled.');
      },
    });
    handler.openIframe();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (loading) return <p className="p-6 text-center text-gray-600">Loading...</p>;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
      <main className="min-h-screen bg-gray-100">
        <Navbar
          profile={profile}
          onCartClick={() => setIsCartOpen(true)}
          cartItemCount={cart.length}
          notifications={notifications}
        />
        <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        <div className="max-w-5xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Customer Dashboard</h1>

          {/* Notifications Section */}
          <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">Notifications</h2>
            {notifications.length === 0 ? (
              <p className="text-gray-600">No notifications available.</p>
            ) : (
              <ul className="space-y-4">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`border border-gray-300 p-4 rounded-lg ${
                      notif.read ? 'bg-gray-100' : 'bg-purple-50'
                    }`}
                  >
                    <p className="text-gray-700">{notif.message}</p>
                    <p className="text-gray-500 text-sm">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                    {!notif.read && (
                      <button
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="mt-2 text-sm text-purple-600 hover:text-purple-800"
                      >
                        Mark as Read
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Invoices Section */}
          <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-gray-600">No invoices available.</p>
            ) : (
              <ul className="space-y-4">
                {invoices.map((invoice) => (
                  <li key={invoice.id} className="border border-gray-300 p-4 rounded-lg">
                    <p className="text-gray-700"><strong>Order ID:</strong> {invoice.order_id}</p>
                    <p className="text-gray-700"><strong>Fabric:</strong> {invoice.custom_orders.fabric}</p>
                    <p className="text-gray-700"><strong>Style:</strong> {invoice.custom_orders.style}</p>
                    <p className="text-gray-700"><strong>Deposit:</strong> ₦{Number(invoice.custom_orders.deposit || 5000).toLocaleString()}</p>
                    <p className="text-gray-700"><strong>Balance:</strong> ₦{Number(invoice.amount - (invoice.custom_orders.deposit || 5000)).toLocaleString()}</p>
                    <p className="text-gray-700"><strong>Total Amount:</strong> ₦{Number(invoice.amount).toLocaleString()}</p>
                    <p className="text-gray-700"><strong>Status:</strong> {invoice.paid ? 'Paid' : 'Pending'}</p>
                    <p className="text-gray-600 text-sm">
                      <strong>Issued:</strong> {new Date(invoice.created_at).toLocaleString()}
                    </p>
                    {invoice.pdf_url && (
                      <a
                        href={invoice.pdf_url}
                        className="text-purple-600 hover:text-purple-800 mr-4"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View/Download Invoice
                      </a>
                    )}
                    {!invoice.paid && (
                      <button
                        onClick={() => initiatePayment(invoice)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                      >
                        Pay Now
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Receipts Section */}
          <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">Receipts</h2>
            {receipts.length === 0 ? (
              <p className="text-gray-600">No receipts available.</p>
            ) : (
              <ul className="space-y-4">
                {receipts.map((receipt) => (
                  <li key={receipt.id} className="border border-gray-300 p-4 rounded-lg">
                    <p className="text-gray-700"><strong>Order ID:</strong> {receipt.invoices.custom_orders.id}</p>
                    <p className="text-gray-700"><strong>Fabric:</strong> {receipt.invoices.custom_orders.fabric}</p>
                    <p className="text-gray-700"><strong>Style:</strong> {receipt.invoices.custom_orders.style}</p>
                    <p className="text-gray-700"><strong>Deposit:</strong> ₦{Number(receipt.invoices.custom_orders.deposit || 5000).toLocaleString()}</p>
                    <p className="text-gray-700"><strong>Balance Paid:</strong> ₦{Number(receipt.amount - (receipt.invoices.custom_orders.deposit || 5000)).toLocaleString()}</p>
                    <p className="text-gray-700"><strong>Total Amount:</strong> ₦{Number(receipt.amount).toLocaleString()}</p>
                    <p className="text-gray-700"><strong>Payment Reference:</strong> {receipt.payment_reference}</p>
                    <p className="text-gray-600 text-sm">
                      <strong>Issued:</strong> {new Date(receipt.created_at).toLocaleString()}
                    </p>
                    {receipt.pdf_url && (
                      <a
                        href={receipt.pdf_url}
                        className="text-purple-600 hover:text-purple-800"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View/Download Receipt
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

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
                    <p className="text-gray-700"><strong>Delivery Status:</strong> {order.delivery_status}</p>
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
            <h2 className="text-2xl font-bold text-purple-700 mb-4">Product Orders</h2>
            {productOrders.length === 0 ? (
              <p className="text-gray-600">You have no product orders yet.</p>
            ) : (
              <ul className="space-y-4">
                {productOrders.map((order) => (
                  <li key={order.id} className="border border-gray-300 p-4 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={order.products.image_url}
                        alt={order.products.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                      />
                      <div>
                        <p className="text-gray-700"><strong>Product:</strong> {order.products.name}</p>
                        <p className="text-gray-700"><strong>Price:</strong> ₦{Number(order.products.price).toLocaleString()}</p>
                        <p className="text-gray-700"><strong>Quantity:</strong> {order.quantity}</p>
                        <p className="text-gray-700"><strong>Status:</strong> {order.status}</p>
                        <p className="text-gray-600 text-sm">
                          <strong>Ordered on:</strong> {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Logout Button */}
          <div className="text-center">
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white font-semibold py-2 px-6 rounded-md hover:bg-red-700 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
}