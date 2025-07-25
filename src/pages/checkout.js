import { useCart } from '@/context/CartContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import CartPanel from '@/components/CartPanel';
import Link from 'next/link';
import Image from 'next/image';
import DressLoader from '@/components/DressLoader';
import 'leaflet/dist/leaflet.css';
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
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === 'undefined') return;

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

    mapRef.current = L.map(mapContainerRef.current, {
      center: mapCenter,
      zoom: 10,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    const searchControl = L.control({ position: 'topleft' });
    searchControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control-search');
      div.innerHTML = `
        <input type="text" id="searchInput" placeholder="Search for an address" style="width: 200px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;" />
        <div id="searchResults" style="background: white; border: 1px solid #ccc; max-height: 200px; overflow-y: auto; display: none;"></div>
      `;
      return div;
    };
    searchControl.addTo(mapRef.current);

    const searchInput = document.getElementById('searchInput');
    const searchResultsDiv = document.getElementById('searchResults');

    const debounce = (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
      };
    };

    const performSearch = debounce(async (query) => {
      if (!query) {
        setSearchResults([]);
        searchResultsDiv.style.display = 'none';
        return;
      }
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
          {
            headers: { 'User-Agent': 'VianClothingHub/1.0 (https://vianclothinghub.com)' },
          }
        );
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data);
        searchResultsDiv.style.display = data.length ? 'block' : 'none';
        searchResultsDiv.innerHTML = data
          .map(
            (result, index) => `
              <div class="search-result" data-index="${index}" style="padding: 5px; cursor: pointer; border-bottom: 1px solid #eee;">
                ${result.display_name}
              </div>
            `
          )
          .join('');
        const resultElements = searchResultsDiv.querySelectorAll('.search-result');
        resultElements.forEach((el) => {
          el.addEventListener('click', () => {
            const index = el.getAttribute('data-index');
            const result = data[index];
            setAddress(result.display_name);
            setMapCenter([parseFloat(result.lat), parseFloat(result.lon)]);
            mapRef.current.setView([parseFloat(result.lat), parseFloat(result.lon)], 14);
            if (marker) marker.remove();
            const newMarker = L.marker([parseFloat(result.lat), parseFloat(result.lon)]).addTo(mapRef.current);
            setMarker(newMarker);
            setSelectedAddressId('');
            setIsEditingAddress(false);
            setEditAddressId(null);
            searchResultsDiv.style.display = 'none';
            searchInput.value = result.display_name;
          });
        });
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
        searchResultsDiv.style.display = 'none';
      }
    }, 500);

    searchInput.addEventListener('input', (e) => performSearch(e.target.value));

    mapRef.current.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      setMapCenter([lat, lng]);
      mapRef.current.setView([lat, lng], 14);
      if (marker) marker.remove();
      const newMarker = L.marker([lat, lng]).addTo(mapRef.current);
      setMarker(newMarker);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          {
            headers: { 'User-Agent': 'VianClothingHub/1.0 (https://vianclothinghub.com)' },
          }
        );
        if (!response.ok) throw new Error('Reverse geocoding failed');
        const data = await response.json();
        if (data.display_name) {
          setAddress(data.display_name);
          setSelectedAddressId('');
          setIsEditingAddress(false);
          setEditAddressId(null);
        }
      } catch (err) {
        setError('Failed to fetch address. Please try again.');
        console.error('Reverse geocode error:', err);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapCenter]);

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

  const handleSaveAddress = async () => {
    if (!address) {
      setError('Please enter a valid address.');
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        {
          headers: { 'User-Agent': 'VianClothingHub/1.0 (https://vianclothinghub.com)' },
        }
      );
      const data = await response.json();
      if (!data[0]) {
        setError('Invalid address. Please enter a valid address.');
        return;
      }
      const { lat, lon } = data[0];

      if (isEditingAddress && editAddressId) {
        const { error } = await supabase
          .from('addresses')
          .update({
            address,
            lat: parseFloat(lat),
            lng: parseFloat(lon),
          })
          .eq('id', editAddressId)
          .eq('user_id', user.id);
        if (error) throw error;
        alert('Address updated successfully!');
      } else {
        const { error } = await supabase.from('addresses').insert([
          {
            user_id: user.id,
            address,
            lat: parseFloat(lat),
            lng: parseFloat(lon),
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

  const handleOrder = async () => {
    if (!address) {
      setError('Please enter or select a delivery address.');
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        {
          headers: { 'User-Agent': 'VianClothingHub/1.0 (https://vianclothinghub.com)' },
        }
      );
      const data = await response.json();
      if (!data[0]) {
        setError('Invalid delivery address. Please select a valid address.');
        return;
      }
      const { lat, lon } = data[0];

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
          lat: parseFloat(lat),
          lng: parseFloat(lon),
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

        <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">Delivery Address</h2>
          {savedAddresses.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Saved Address</label>
              <select
                value={selectedAddressId}
                onChange={handleSavedAddressChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>
          <button
            onClick={handleSaveAddress}
            className="mb-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            {isEditingAddress ? 'Update Address' : 'Save Address'}
          </button>
          <div className="h-64 w-full" ref={mapContainerRef}></div>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </section>

        <button
          onClick={handleOrder}
          className="w-full bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 font-semibold"
          disabled={!address}
        >
          Confirm & Place Order
        </button>
      </div>
      <Footer />
    </main>
  );
}