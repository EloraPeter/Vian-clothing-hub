"use client";

import { useCart } from '@/context/CartContext';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import CartPanel from '@/components/CartPanel';
import Link from 'next/link';
import Script from 'next/script';
import { initiatePayment } from '@/lib/payment';
import DressLoader from '@/components/DressLoader';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([9.0820, 8.6753]);
  const [marker, setMarker] = useState(null);
  const mapRef = useRef();
  const mapContainerRef = useRef();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressId, setEditAddressId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
      } else {
        setUser(session.user);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profileError) {
          setError(profileError.message);
        } else {
          setProfile(profileData || { email: session.user.email, avatar_url: null });
        }
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
          }
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

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

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(mapCenter, 10);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(mapRef.current);

      if (savedAddresses.length > 0 && savedAddresses[0].lat && savedAddresses[0].lng) {
        const initialMarker = L.marker([savedAddresses[0].lat, savedAddresses[0].lng]).addTo(mapRef.current);
        setMarker(initialMarker);
        mapRef.current.setView([savedAddresses[0].lat, savedAddresses[0].lng], 14);
      }
    }

    const searchControl = L.control({ position: 'topleft' });
    searchControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control-search flex space-x-2');
      div.innerHTML = `
        <input
          type="text"
          id="searchInput"
          placeholder="Search for an address"
          class="flex-1 px-4 py-2 border border-gray-600 rounded-xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:border-blue-400 dark:focus:ring-blue-400 transition-colors"
        />
        <button
          id="clearSearch"
          class="bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Clear
        </button>
        <div
          id="searchResults"
          class="hidden bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto z-[1000]"
        ></div>
      `;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      return div;
    };
    searchControl.addTo(mapRef.current);

    const searchInput = document.getElementById('searchInput');
    const searchResultsDiv = document.getElementById('searchResults');
    const clearButton = document.getElementById('clearSearch');

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
        const response = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);

        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data);
        searchResultsDiv.style.display = data.length ? 'block' : 'none';
        searchResultsDiv.innerHTML = data
          .map(
            (result, index) => `
              <div
                class="search-result px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-blue-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-blue-400 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                data-index="${index}"
              >
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
            if (mapRef.current) {
              mapRef.current.setView([parseFloat(result.lat), parseFloat(result.lon)], 14);
              if (marker) {
                marker.setLatLng([parseFloat(result.lat), parseFloat(result.lon)]);
              } else {
                const newMarker = L.marker([parseFloat(result.lat), parseFloat(result.lon)]).addTo(mapRef.current);
                setMarker(newMarker);
              }
            }
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
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      setSearchResults([]);
      searchResultsDiv.style.display = 'none';
    });

    mapRef.current.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      setMapCenter([lat, lng]);
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 14);
        if (marker) {
          marker.setLatLng([lat, lng]);
        } else {
          const newMarker = L.marker([lat, lng]).addTo(mapRef.current);
          setMarker(newMarker);
        }
      }
      try {
        const response = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);

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
        setMarker(null);
      }
    };
  }, [mapCenter, savedAddresses]);

  useEffect(() => {
    if (!mapRef.current || !marker) return;

    try {
      mapRef.current.setView(mapCenter, 14);
      marker.setLatLng(mapCenter);
    } catch (err) {
      console.error('Leaflet update error:', err);
      setMarker(null);
    }
  }, [mapCenter, marker]);

  const handleSavedAddressChange = (e) => {
    const addressId = e.target.value;
    setSelectedAddressId(addressId);
    const selected = savedAddresses.find((addr) => addr.id === addressId);
    if (selected) {
      setAddress(selected.address);
      setMapCenter([selected.lat || 9.0820, selected.lng || 8.6753]);
      if (mapRef.current) {
        mapRef.current.setView([selected.lat || 9.0820, selected.lng || 8.6753], 14);
        try {
          if (marker) {
            marker.setLatLng([selected.lat, selected.lng]);
          } else {
            const L = require('leaflet');
            const newMarker = L.marker([selected.lat, selected.lng]).addTo(mapRef.current);
            setMarker(newMarker);
          }
        } catch (err) {
          console.error('Marker set error:', err);
          setMarker(null);
        }
      }
      setIsEditingAddress(false);
      setEditAddressId(null);
    } else {
      setAddress('');
      if (marker) {
        try {
          marker.remove();
        } catch (err) {
          console.error('Marker remove error:', err);
        }
        setMarker(null);
      }
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
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(address)}`);

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
      try {
        if (marker) {
          marker.setLatLng([addr.lat, addr.lng]);
        } else {
          const L = require('leaflet');
          const newMarker = L.marker([addr.lat, addr.lng]).addTo(mapRef.current);
          setMarker(newMarker);
        }
      } catch (err) {
        console.error('Marker edit error:', err);
        setMarker(null);
      }
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
      if (newAddresses.length > 0 && newAddresses[0]) {
        setMapCenter([newAddresses[0].lat || 9.0820, newAddresses[0].lng || 8.6753]);
        if (mapRef.current) {
          mapRef.current.setView([newAddresses[0].lat || 9.0820, newAddresses[0].lng || 8.6753], 14);
          try {
            if (marker) {
              marker.setLatLng([newAddresses[0].lat, newAddresses[0].lng]);
            } else {
              const L = require('leaflet');
              const newMarker = L.marker([newAddresses[0].lat, newAddresses[0].lng]).addTo(mapRef.current);
              setMarker(newMarker);
            }
          } catch (err) {
            console.error('Marker delete error:', err);
            setMarker(null);
          }
        }
      } else {
        setMapCenter([9.0820, 8.6753]);
        if (marker) {
          try {
            marker.remove();
          } catch (err) {
            console.error('Marker remove error:', err);
          }
          setMarker(null);
        }
      }
      alert('Address deleted successfully!');
    } catch (err) {
      setError('Failed to delete address: ' + err.message);
    }
  };

  // Helper function to validate and map cart items
const mapCartItems = (cart) => {
  return cart.map((item) => {
    let itemId;

    if (item.product_id) {
      itemId = item.product_id.toString();
    } else if (typeof item.id === 'string') {
      itemId = item.id.split('-')[0];
    } else if (typeof item.id === 'number') {
      itemId = item.id.toString();
    } else {
      console.error('Invalid cart item ID:', item);
      throw new Error(`Invalid cart item ID: ${item.name || 'unknown'}`);
    }

    return {
      id: itemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      image_url: item.image_url,
      discount_percentage: item.discount_percentage || 0,
    };
  });
};

const handleOrder = async (e) => {
  e.preventDefault();
  setIsPaying(true);
  setError(null);

  console.log('Cart contents:', cart);

  if (!address) {
    setError('Please enter or select a delivery address.');
    setIsPaying(false);
    return;
  }

  try {
    const response = await fetch(`/api/geocode?query=${encodeURIComponent(address)}`);
    const data = await response.json();

    if (!data[0]) {
      setError('Invalid delivery address. Please select a valid address.');
      setIsPaying(false);
      return;
    }

    const { lat, lon } = data[0];

    const placeOrder = async (paymentReference) => {
      const items = mapCartItems(cart);

      const { error } = await supabase.from('orders').insert([
        {
          user_id: user.id,
          items,
          address,
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          status: 'processing',
          total: totalPrice,
          created_at: new Date().toISOString(),
          payment_reference: paymentReference,
        },
      ]);

      if (error) {
        console.error('Supabase insert error:', error.message, error.details, error.hint);
        throw error;
      }

      console.log('Order saved successfully');
      clearCart();
      router.push('/orders');
      toast.success('Payment successful! Order placed.');
    };

    const success = await initiatePayment({
      email: profile?.email || user.email,
      totalPrice,
      setError,
      setIsPaying,
      orderCallback: placeOrder,
      useApiFallback: true,
    });

    if (!success) {
      throw new Error('Payment initiation failed');
    }
  } catch (err) {
    console.error('Order error:', err.message);
    setError('Order failed: ' + err.message);
    setIsPaying(false);
  }
};


  if (loading) return <DressLoader />;
  if (error && !isPaying) return <p className="p-6 text-center text-red-600">Error: {error}</p>;
  if (cart.length === 0) return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold bg-gray-100 mb-6 text-blue-600 text-center">Checkout</h1>
      <p className="text-gray-600">
        Your cart is empty.{' '}
        <Link href="/" className="text-blue-600 hover:underline">
          Continue shopping
        </Link>.
      </p>
    </main>
  );

  return (
    <>
      <Script
        src="https://js.paystack.co/v2/inline.js"
        strategy="afterInteractive"
        onError={(e) => console.error('Paystack script failed to load:', e)}
      />      <main className="min-h-screen bg-gray-100">
        <Navbar
          profile={profile}
          onCartClick={() => setIsCartOpen(true)}
          cartItemCount={cart.length}
        />
        <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

        <form onSubmit={handleOrder} className="max-w-5xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-blue-600 dark:text-blue-400 text-center">Checkout</h1>

          <section className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">Cart Summary</h2>
            <ul className="space-y-4">
              {cart.map((item) => (
                <li
                  key={`${item.id}-${item.size || ''}-${item.color || ''}`}
                  className="flex items-center space-x-4 border-b border-gray-300 dark:border-gray-600 pb-4"
                >
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-200 font-medium">
                      {item.name}
                      {item.size && ` (${item.size}${item.color ? `, ${item.color}` : ''})`}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {item.discount_percentage > 0 ? (
                        <span>
                          <span className="text-red-600 dark:text-red-400 line-through">
                            ₦{Number(item.price).toLocaleString()}
                          </span>{' '}
                          <span className="text-green-600 dark:text-green-400">
                            ₦{(item.price * (1 - item.discount_percentage / 100)).toLocaleString()}
                          </span>
                        </span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">
                          ₦{Number(item.price).toLocaleString()}
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Quantity: {item.quantity}</p>
                    {item.is_out_of_stock && <p className="text-red-600 dark:text-red-400 text-sm">Out of Stock</p>}
                  </div>
                  <p className="text-gray-700 dark:text-gray-200 font-medium">
                    Total: ₦{(
                      (item.discount_percentage > 0
                        ? item.price * (1 - item.discount_percentage / 100)
                        : item.price) * item.quantity
                    ).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-4">
              Subtotal: ₦{totalPrice.toLocaleString()}
            </p>
          </section>

          <section className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">Delivery Address</h2>
            {savedAddresses.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Select Saved Address
                </label>
                <select
                  value={selectedAddressId}
                  onChange={handleSavedAddressChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-400 dark:focus:ring-blue-400"
                >
                  <option value="">Select an address</option>
                  {savedAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>{addr.address}</option>
                  ))}
                </select>
                <div className="mt-4 grid grid-cols-1 gap-4">
                  {savedAddresses.map((addr) => (
                    <div key={addr.id} className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                      <span className="text-gray-700 dark:text-gray-200">{addr.address}</span>
                      <div>
                        <button
                          onClick={() => handleEditAddress(addr)}
                          className="text-blue-600 dark:text-blue-400 hover:underline mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-red-600 dark:text-red-400 hover:underline"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                {isEditingAddress ? 'Edit Address' : 'Enter or Search Address'}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter delivery address"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-blue-400 dark:focus:ring-blue-400"
              />
            </div>
            <button
              onClick={handleSaveAddress}
              className="mb-4 bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              {isEditingAddress ? 'Update Address' : 'Save Address'}
            </button>
            <div className="h-64 w-full" ref={mapContainerRef}></div>
            {error && <p className="text-red-600 dark:text-red-400 mt-2">{error}</p>}
          </section>

          <button
            type="submit"
            className="w-full bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 font-semibold disabled:bg-gray-400 dark:disabled:bg-gray-600"
            disabled={!address || isPaying}
          >
            {isPaying ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </form>
        <Footer />
      </main>
    </>
  );
}