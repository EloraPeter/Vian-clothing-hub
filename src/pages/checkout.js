
import { useCart } from '@/context/CartContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import L from 'leaflet';
import { MaptilerLayer, MaptilerGeocoder } from '@maptiler/leaflet';
import 'leaflet/dist/leaflet.css';

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

  // MapTiler API key (replace with your key)
  const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || !MAPTILER_API_KEY) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: 10,
    });

    // Add MapTiler layer
    new MaptilerLayer({
      apiKey: MAPTILER_API_KEY,
      style: 'streets-v2', // Use MapTiler's streets style
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
      setSelectedAddressId(''); // Clear saved address selection
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
        const data = await response.json();
        if (data.features[0]) {
          setAddress(data.features[0].place_name);
          setSelectedAddressId('');
        }
      } catch (err) {
        console.error('Reverse geocode error:', err);
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
    } else {
      setAddress('');
      if (marker) marker.remove();
      setMarker(null);
    }
  };

  // Save new address
  const handleSaveAddress = async () => {
    if (!address) {
      alert('Please enter an address.');
      return;
    }
    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${MAPTILER_API_KEY}`
      );
      const data = await response.json();
      if (!data.features[0]) throw new Error('Invalid address');
      const { center } = data.features[0];
      const { error } = await supabase.from('addresses').insert([
        {
          user_id: user.id,
          address,
          lat: center[1],
          lng: center[0],
        },
      ]);
      if (error) throw error;
      const { data: newAddresses } = await supabase
        .from('addresses')
        .select('id, address, lat, lng')
        .eq('user_id', user.id);
      setSavedAddresses(newAddresses || []);
      setSelectedAddressId(newAddresses[newAddresses.length - 1].id);
      alert('Address saved successfully!');
    } catch (err) {
      alert('Failed to save address: ' + err.message);
    }
  };

  // Place order
  const handleOrder = async () => {
    if (!address) {
      alert('Please enter or select a delivery address.');
      return;
    }
    try {
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
          status: 'awaiting payment',
          total: totalPrice,
        },
      ]);
      if (error) throw error;
      clearCart();
      router.push('/dashboard');
    } catch (err) {
      alert('Order failed: ' + err.message);
    }
  };

  if (loading) return <p className="p-6 text-center text-gray-600">Loading...</p>;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;
  if (cart.length === 0) return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Checkout</h1>
      <p className="text-gray-600">
        Your cart is empty.{' '}
        <a href="/" className="text-purple-600 hover:underline">
          Continue shopping
        </a>.
      </p>
    </main>
  );

  return (
    <main className="p-6 max-w-5xl mx-auto">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select an address</option>
              {savedAddresses.map((addr) => (
                <option key={addr.id} value={addr.id}>{addr.address}</option>
              ))}
            </select>
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Enter or Search Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter delivery address"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button
          onClick={handleSaveAddress}
          className="mb-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Save Address
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
    </main>
  );
}
