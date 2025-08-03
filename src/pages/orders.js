import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import DressLoader from '@/components/DressLoader';
import Head from 'next/head';
import Link from 'next/link';
import { ChevronDownIcon, ChevronUpIcon, TruckIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function OrderTrackingPage() {
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const router = useRouter();
  const [user, setUser] = useState(null);

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
      setUser(user);
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

  // Real-time order updates
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, (payload) => {
        setOrders((prev) =>
          prev.map((order) => (order.id === payload.new.id ? payload.new : order))
        );
      })
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, [user]);

  // Status colors and icons
  const getStatusDetails = (status) => {
    switch (status) {
      case 'awaiting_payment':
        return { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, label: 'Awaiting Payment' };
      case 'processing':
        return { color: 'bg-blue-100 text-blue-800', icon: ClockIcon, label: 'Processing' };
      case 'shipped':
        return { color: 'bg-purple-100 text-purple-800', icon: TruckIcon, label: 'Shipped' };
      case 'delivered':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, label: 'Delivered' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: ClockIcon, label: 'Unknown' };
    }
  };

  // Progress bar steps
  const getProgressSteps = (status) => {
    const steps = ['Awaiting Payment', 'Processing', 'Shipped', 'Delivered'];
    const currentStep = steps.indexOf(getStatusDetails(status).label);
    return steps.map((step, index) => ({
      label: step,
      completed: index <= currentStep,
    }));
  };

  // Toggle order details
  const toggleOrder = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
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
      <main className="min-h-screen bg-gray-50">
        <Navbar profile={profile} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Your Orders</h1>
          {orders.length === 0 ? (
            <div className="text-center bg-white p-8 rounded-lg shadow-sm">
              <p className="text-gray-600 text-lg">
                You have no orders yet.{' '}
                <Link href="/" className="text-purple-600 hover:underline font-semibold">
                  Continue shopping
                </Link>.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const statusDetails = getStatusDetails(order.status);
                const progressSteps = getProgressSteps(order.status);
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div
                      className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleOrder(order.id)}
                    >
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900">
                          Order #{order.id}
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">
                          Placed on: {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusDetails.color}`}
                        >
                          <statusDetails.icon className="w-5 h-5 mr-2" />
                          {statusDetails.label}
                        </span>
                        {expandedOrder === order.id ? (
                          <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                    {expandedOrder === order.id && (
                      <div className="p-6 border-t border-gray-200">
                        {/* Progress Bar */}
                        <div className="mb-6">
                          <div className="flex justify-between mb-2">
                            {progressSteps.map((step, index) => (
                              <div key={index} className="flex-1 text-center">
                                <div
                                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                                    step.completed ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                                  }`}
                                >
                                  {index + 1}
                                </div>
                                <p className="text-xs font-medium text-gray-600 mt-1">{step.label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="relative h-2 bg-gray-200 rounded-full">
                            <div
                              className="absolute h-2 bg-purple-600 rounded-full"
                              style={{ width: `${(progressSteps.filter(s => s.completed).length / progressSteps.length) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        {/* Order Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery Address</h3>
                            <p className="text-gray-600">{order.address}</p>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Items</h3>
                            <ul className="space-y-4">
                              {order.items.map((item) => (
                                <li key={item.id} className="flex items-center space-x-4">
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                  />
                                  <div className="flex-1">
                                    <p className="text-gray-900 font-medium">{item.name}</p>
                                    <p className="text-gray-600 text-sm">
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
                                    <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
                                  </div>
                                  <p className="text-gray-900 font-medium">
                                    ₦{(
                                      (item.discount_percentage > 0
                                        ? item.price * (1 - item.discount_percentage / 100)
                                        : item.price) * item.quantity
                                    ).toLocaleString()}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                          <p className="text-xl font-bold text-purple-700">
                            Total: ₦{order.total.toLocaleString()}
                          </p>
                          <div className="space-x-4">
                            <Link
                              href={`/order/${order.id}`}
                              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              View Details
                            </Link>
                            {order.status === 'shipped' && (
                              <button
                                onClick={() => toast.info('Shipment tracking will be available soon.')}
                                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
                              >
                                <TruckIcon className="w-5 h-5 mr-2" />
                                Track Shipment
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Footer />
      </main>
    </>
  );
}