import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import DressLoader from '@/components/DressLoader';
import Head from 'next/head';
import Link from 'next/link';
import { TruckIcon, ClockIcon, CheckCircleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export default function OrderDetailPage() {
    const [order, setOrder] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();
    const { id } = router.query;
    const mapRef = useRef();
    const mapContainerRef = useRef();
    const [mapCenter, setMapCenter] = useState([9.0820, 8.6753]);
    const [marker, setMarker] = useState(null);

    // Fetch user profile and order details
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

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('id, created_at, items, address, status, total, lat, lng, shipping_fee, payment_reference')
                .eq('id', id)
                .eq('user_id', user.id)
                .maybeSingle();
            if (orderError) {
                setError(orderError.message);
            } else if (!orderData) {
                setError('Order not found or you do not have access to this order.');
            } else {
                setOrder(orderData);
                setMapCenter([orderData.lat || 9.0820, orderData.lng || 8.6753]);
            }
            setLoading(false);
        }
        fetchData();
    }, [id, router]);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || !order || typeof window === 'undefined') return;

        let L;
        try {
            L = require('leaflet');
        } catch (err) {
            setError('Failed to load map library. Please try again later.');
            console.error('Map library error:', err);
            return;
        }

        const DefaultIcon = L.icon({
            iconUrl: markerIcon.src,
            shadowUrl: markerShadow.src,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });
        L.Marker.prototype.options.icon = DefaultIcon;

        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView(mapCenter, 14);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com/attributions">CARTO</a>',
            }).addTo(mapRef.current);

            if (order.lat && order.lng) {
                const initialMarker = L.marker([order.lat, order.lng]).addTo(mapRef.current);
                setMarker(initialMarker);
                mapRef.current.setView([order.lat, order.lng], 14);
            }
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                setMarker(null);
            }
        };
    }, [order, mapCenter]);

    // Status details
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

    // Mock download receipt (placeholder)
    const handleDownloadReceipt = () => {
        alert('Receipt download functionality is not implemented yet.');
    };

    if (loading) return <DressLoader />;
    if (error) return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
            <p className="p-6 text-center text-red-600 text-lg font-semibold">Error: {error}</p>
        </main>
    );
    if (!order) return null;

    const statusDetails = getStatusDetails(order.status);
    const progressSteps = getProgressSteps(order.status);

    return (
        <>
            <Head>
                <title>Order #{order.id} - Vian Clothing Hub</title>
                <meta
                    name="description"
                    content={`View details for order #${order.id} with Vian Clothing Hub, including status, items, and delivery information.`}
                />
                <meta name="keywords" content={`order ${order.id}, Vian Clothing Hub, order details, delivery tracking`} />
                <meta name="author" content="Vian Clothing Hub" />
                <meta property="og:title" content={`Order #${order.id} - Vian Clothing Hub`} />
                <meta property="og:description" content={`Track and view details for order #${order.id} with Vian Clothing Hub.`} />
            </Head>
            <main className="min-h-screen bg-gray-50">
                <Navbar profile={profile} />
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-4xl font-bold text-gray-900">Order #{order.id}</h1>
                        <Link href="/orders" className="text-purple-600 hover:underline font-semibold">
                            Back to Orders
                        </Link>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                            <div>
                                <p className="text-gray-600">
                                    Placed on: {new Date(order.created_at).toLocaleDateString()}
                                </p>
                                <p className="text-gray-600">Payment Reference: {order.payment_reference || 'N/A'}</p>
                            </div>
                            <span
                                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${statusDetails.color}`}
                            >
                                <statusDetails.icon className="w-5 h-5 mr-2" />
                                {statusDetails.label}
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="mb-8">
                            <div className="flex justify-between mb-2">
                                {progressSteps.map((step, index) => (
                                    <div key={index} className="flex-1 text-center">
                                        <div
                                            className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${step.completed ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Items */}
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
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
                                                    {item.size && `Size: ${item.size}${item.color ? `, Color: ${item.color}` : ''}`}
                                                </p>
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
                            {/* Delivery Address and Map */}
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>
                                <p className="text-gray-600 mb-4">{order.address}</p>
                                <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200" ref={mapContainerRef}></div>
                            </div>
                        </div>
                        {/* Order Summary */}
                        <div className="mt-8 border-t border-gray-200 pt-6">
                            <div className="flex justify-between text-gray-900 font-medium mb-2">
                                <span>Subtotal</span>
                                <span>₦{(order.total - (order.shipping_fee || 0)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-900 font-medium mb-2">
                                <span>Shipping</span>
                                <span>₦{(order.shipping_fee || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gray-900 font-bold text-lg">
                                <span>Total</span>
                                <span>₦{order.total.toLocaleString()}</span>
                            </div>
                        </div>
                        {/* Action Buttons */}
                        <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4">
                            <button
                                onClick={handleDownloadReceipt}
                                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                                Download Receipt
                            </button>
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
                <Footer />
            </main>
        </>
    );
}