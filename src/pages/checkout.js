import { useCart } from '@/context/CartContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import CartPanel from '@/components/CartPanel';
import Link from 'next/link'
import Image from 'next/image'
import DressLoader from '@/components/DressLoader';
import zxcvbn from 'zxcvbn';

// Leaflet CSS
import 'leaflet/dist/leaflet.css';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import L from 'leaflet';
import { MaptilerLayer, MaptilerGeocoder } from '@maptiler/leaflet-maptilersdk';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';


export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([9.0820, 8.6753]); // Default to Nigeria center
  const [marker, setMarker] = useState(null);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressId, setEditAddressId] = useState(null);

  // MapTiler API key
  const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

  // Initialize Leaflet map (client-side only)
  useEffect(() => {
    if (!mapContainerRef.current || !MAPTILER_API_KEY || typeof window === 'undefined') return;

    const L = require('leaflet');

    // Set default Leaflet icon
    const DefaultIcon = L.icon({
      iconUrl: markerIcon.src,
      shadowUrl: markerShadow.src,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: 10,
    });

    // Add MapTiler layer
    const maptilerLayer = new MaptilerLayer({
      apiKey: MAPTILER_API_KEY,
      style: 'streets-v2',
    }).addTo(mapRef.current);

    // Add geocoding control
    const geocoder = new MaptilerGeocoder({
      apiKey: MAPTILER_API_KEY,
      placeholder: 'Search for an address',
      language: 'en',
      limit: 5,
    });
    geocoder.addTo(mapRef.current);

    // Handle geocoding result
    geocoder.on('select', (result) => {
      const { center, text } = result;
      setAddress(text);
      setMapCenter([center[1], center[0]]);
      mapRef.current.setView([center[1], center[0]], 14);
      if (marker) marker.remove();
      const newMarker = L.marker([center[1], center[0]]).addTo(mapRef.current);
      setMarker(newMarker);
      setSelectedAddressId('');
      setIsEditingAddress(false);
      setEditAddressId(null);
    });

    // Handle map click for reverse geocoding
    mapRef.current.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      setMapCenter([lat, lng]);
      mapRef.current.setView([lat, lng], 14);
      if (marker) marker.remove();
      const newMarker = L.marker([lat, lng]).addTo(mapRef.current);
      setMarker(newMarker);
      try {
        const response = await fetch(
          `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_API_KEY}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Reverse geocoding failed:", errorText);
          return;
        }
        const data = await response.json();
        if (data.features[0]) {
          setAddress(data.features[0].place_name);
          setSelectedAddressId('');
          setIsEditingAddress(false);
          setEditAddressId(null);
        }
      } catch (err) {
        console.error('Reverse geocode error:', err);
        setError('Failed to fetch address. Please try again.');
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [MAPTILER_API_KEY]);

  // Check session and fetch addresses
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
      } else {
        setUser(session.user);
        const { data: addresses, error: addressError } = await supabase
          .from('addresses')
          .select('id, address, lat, lng')
          .eq('user_id', session.user.id);
        if (addressError) {
          setError(addressError.message);
        } else {
          setSavedAddresses(addresses || []);
          if (addresses.length > 0) {
            setSelectedAddressId(addresses[0].id);
            setAddress(addresses[0].address);
            setMapCenter([addresses[0].lat || 9.0820, addresses[0].lng || 8.6753]);
            if (mapRef.current && addresses[0].lat && addresses[0].lng) {
              mapRef.current.setView([addresses[0].lat, addresses[0].lng], 14);
              if (marker) marker.remove();
              const newMarker = L.marker([addresses[0].lat, addresses[0].lng]).addTo(mapRef.current);
              setMarker(newMarker);
            }
          }
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  // Handle saved address selection
  const handleSavedAddressChange = (e) => {
    const addressId = e.target.value;
    setSelectedAddressId(addressId);
    const selected = savedAddresses.find((addr) => addr.id === addressId);
    if (selected) {
      setAddress(selected.address);
      setMapCenter([selected.lat || 9.0820, selected.lng || 8.6753]);
      if (mapRef.current) {
        mapRef.current.setView([selected.lat || 9.0820, selected.lng || 8.6753], 14);
        if (marker) marker.remove();
        const newMarker = L.marker([selected.lat, selected.lng]).addTo(mapRef.current);
        setMarker(newMarker);
      }
      setIsEditingAddress(false);
      setEditAddressId(null);
    } else {
      setAddress('');
      if (marker) marker.remove();
      setMarker(null);
      setIsEditingAddress(false);
      setEditAddressId(null);
    }
  };

  // Save or update address
  const handleSaveAddress = async () => {
    if (!address) {
      setError('Please enter a valid address.');
      return;
    }
    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${MAPTILER_API_KEY}`
      );
      const data = await response.json();
      if (!data.features[0]) {
        setError('Invalid address. Please enter a valid address.');
        return;
      }
      const { center } = data.features[0];
      
      if (isEditingAddress && editAddressId) {
        // Update existing address
        const { error } = await supabase
          .from('addresses')
          .update({
            address,
            lat: center[1],
            lng: center[0],
          })
          .eq('id', editAddressId)
          .eq('user_id', user.id);
        if (error) throw error;
        alert('Address updated successfully!');
      } else {
        // Save new address
        const { error } = await supabase.from('addresses').insert([
          {
            user_id: user.id,
            address,
            lat: center[1],
            lng: center[0],
          },
        ]);
        if (error) throw error;
        alert('Address saved successfully!');
      }
      
      const { data: newAddresses } = await supabase
        .from('addresses')
        .select('id, address, lat, lng')
        .eq('user_id', user.id);
      setSavedAddresses(newAddresses || []);
      setSelectedAddressId(isEditingAddress ? editAddressId : newAddresses[newAddresses.length - 1].id);
      setIsEditingAddress(false);
      setEditAddressId(null);
      setError(null);
    } catch (err) {
      setError('Failed to save address: ' + err.message);
    }
  };

  // Edit address
  const handleEditAddress = (addr) => {
    setIsEditingAddress(true);
    setEditAddressId(addr.id);
    setAddress(addr.address);
    setMapCenter([addr.lat || 9.0820, addr.lng || 8.6753]);
    if (mapRef.current) {
      mapRef.current.setView([addr.lat || 9.0820, addr.lng || 8.6753], 14);
      if (marker) marker.remove();
      const newMarker = L.marker([addr.lat, addr.lng]).addTo(mapRef.current);
      setMarker(newMarker);
    }
  };

  // Delete address
  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id);
      if (error) throw error;
      const { data: newAddresses } = await supabase
        .from('addresses')
        .select('id, address, lat, lng')
        .eq('user_id', user.id);
      setSavedAddresses(newAddresses || []);
      setSelectedAddressId(newAddresses.length > 0 ? newAddresses[0].id : '');
      setAddress(newAddresses.length > 0 ? newAddresses[0].address : '');
      setIsEditingAddress(false);
      setEditAddressId(null);
      if (newAddresses.length > 0 && mapRef.current) {
        mapRef.current.setView([newAddresses[0].lat || 9.0820, newAddresses[0].lng || 8.6753], 14);
        if (marker) marker.remove();
        const newMarker = L.marker([newAddresses[0].lat, newAddresses[0].lng]).addTo(mapRef.current);
        setMarker(newMarker);
      } else {
        setMapCenter([9.0820, 8.6753]);
        if (marker) marker.remove();
        setMarker(null);
      }
      alert('Address deleted successfully!');
    } catch (err) {
      setError('Failed to delete address: ' + err.message);
    }
  };

  // Place order
  const handleOrder = async () => {
    if (!address) {
      setError('Please enter or select a delivery address.');
      return;
    }
    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${MAPTILER_API_KEY}`
      );
      const data = await response.json();
      if (!data.features[0]) {
        setError('Invalid delivery address. Please select a valid address.');
        return;
      }
      const { center } = data.features[0];
      
      const { error } = await supabase.from('orders').insert([
        {
          user_id: user.id,
          items: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            discount_percentage: item.discount_percentage || 0,
            image_url: item.image_url,
          })),
          address,
          lat: center[1],
          lng: center[0],
          status: 'awaiting_payment',
          total: totalPrice,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      clearCart();
      router.push('/orders');
    } catch (err) {
      setError('Order failed: ' + err.message);
    }
  };

  if (loading) return <DressLoader />;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;
  if (cart.length === 0) return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Checkout</h1>
      <p className="text-gray-600">
        Your cart is empty.{' '}
        <Link href="/" className="text-purple-600 hover:underline">
          Continue shopping
        </Link>.
      </p>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-100">
      <Navbar
        profile={profile}
        onCartClick={() => setIsCartOpen(true)}
        cartItemCount={cart.length}
      />
      <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Checkout</h1>

        {/* Cart Summary */}
        <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Cart Summary</h2>
          <ul className="space-y-4">
            {cart.map((item) => (
              <li key={item.id} className="flex items-center space-x-4 border-b border-gray-300 pb-4">
                <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-lg border border-gray-300" />
                <div className="flex-1">
                  <p className="text-gray-700 font-medium">{item.name}</p>
                  <p className="text-gray-600">
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
                  <p className="text-gray-600">Quantity: {item.quantity}</p>
                  {item.is_out_of_stock && <p className="text-red-600 text-sm">Out of Stock</p>}
                </div>
                <p className="text-gray-700 font-medium">
                  Total: ₦{((item.discount_percentage > 0 ? item.price * (1 - item.discount_percentage / 100) : item.price) * item.quantity).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xl font-bold text-purple-700 mt-4">Subtotal: ₦{totalPrice.toLocaleString()}</p>
        </section>

        {/* Delivery Address */}
        <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Delivery Address</h2>
          {savedAddresses.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Saved Address</label>
              <select
                value={selectedAddressId}
                onChange={handleSavedAddressChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none text-black focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select an address</option>
                {savedAddresses.map((addr) => (
                  <option key={addr.id} value={addr.id}>{addr.address}</option>
                ))}
              </select>
              <div className="mt-4 grid grid-cols-1 gap-4">
                {savedAddresses.map((addr) => (
                  <div key={addr.id} className="flex justify-between items-center border-b border-gray-200 pb-2">
                    <span className="text-gray-700">{addr.address}</span>
                    <div>
                      <button
                        onClick={() => handleEditAddress(addr)}
                        className="text-blue-600 hover:underline mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEditingAddress ? 'Edit Address' : 'Enter or Search Address'}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter delivery address"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-black"
            />
          </div>
          <button
            onClick={handleSaveAddress}
            className="mb-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            {isEditingAddress ? 'Update Address' : 'Save Address'}
          </button>
          <div className="h-64 w-full" ref={mapContainerRef}></div>
        </section>

        {/* Confirm Order */}
        <button
          onClick={handleOrder}
          className="w-full bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors font-semibold"
          disabled={!address}
        >
          Confirm & Place Order
        </button>
      </div>
      <Footer />
    </main>
  );
}