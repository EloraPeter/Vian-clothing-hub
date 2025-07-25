import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import DressLoader from '@/components/DressLoader';
import Head from 'next/head';

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Fetch user profile and orders
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      const user = session.user;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
      setProfile(profileData);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, items, address, status, total, lat, lng')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (ordersError) {
        setError(ordersError.message);
      } else {
        setOrders(ordersData || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  // Status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'awaiting_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <DressLoader />;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

  return (
    <>
      <Head>
        <title>Order Tracking - Vian Clothing Hub</title>
        <meta
          name="description"
          content="Track your orders with Vian Clothing Hub. View order status, items, and delivery details."
        />
        <meta name="keywords" content="order tracking, Vian Clothing Hub, order status, delivery tracking" />
        <meta name="author" content="Vian Clothing Hub" />
        <meta property="og:title" content="Order Tracking - Vian Clothing Hub" />
        <meta property="og:description" content="Monitor your order status and delivery details with Vian Clothing Hub." />
      </Head>
      <main className="min-h-screen bg-gray-100">
        <Navbar profile={profile} />
        <div className="max-w-5xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Order Tracking</h1>
          {orders.length === 0 ? (
            <p className="text-gray-600 text-center">
              You have no orders yet.{' '}
              <a href="/" className="text-purple-600 hover:underline">
                Continue shopping
              </a>.
            </p>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white p-6 rounded-xl shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Order #{order.id}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">
                    Placed on: {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600 mb-4">
                    Delivery Address: {order.address}
                  </p>
                  <ul className="space-y-4 border-t border-gray-200 pt-4">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center space-x-4">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                        />
                        <div className="flex-1">
                          <p className="text-gray-700 font-medium">{item.name}</p>
                          <p className="text-gray-600">
                            {item.discount_percentage > 0 ? (
                              <span>
                                <span className="text-red-600 line-through">
                                  ₦{Number(item.price).toLocaleString()}
                                </span>{' '}
                                <span className="text-green-600">
                                  ₦{(item.price * (1 - item.discount_percentage / 100)).toLocaleString()}
                                </span>
                              </span>
                            ) : (
                              <span>₦{Number(item.price).toLocaleString()}</span>
                            )}
                          </p>
                          <p className="text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <p className="text-gray-700 font-medium">
                          Total: ₦
                          {((item.discount_percentage > 0
                            ? item.price * (1 - item.discount_percentage / 100)
                            : item.price) * item.quantity).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xl font-bold text-purple-700 mt-4">
                    Total: ₦{order.total.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <Footer />
      </main>
    </>
  );
}