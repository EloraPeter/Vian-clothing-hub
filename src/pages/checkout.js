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
import sendReceiptEmail from '@/lib/sendReceiptEmail';


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
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFees, setShippingFees] = useState({});

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
        // Fetch shipping fees
        const { data: shippingData, error: shippingError } = await supabase
          .from('shipping_fees')
          .select('state_name, shipping_fee');
        if (shippingError) {
          setError(shippingError.message);
        } else {
          const feesMap = shippingData.reduce((acc, { state_name, shipping_fee }) => ({
            ...acc,
            [state_name.toLowerCase()]: shipping_fee
          }), {});
          setShippingFees(feesMap);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  // Function to extract state from address
  const extractStateFromAddress = (address) => {
    if (!address) return null;
    const addressParts = address.split(',').map(part => part.trim().toLowerCase());
    const nigerianStates = [
      'abuja', 'lagos', 'delta', 'rivers', 'kano', 'kaduna', 'oyo', 'anambra', 'enugu', 'akwa ibom',
      'adamawa', 'bauchi', 'bayelsa', 'benue', 'borno', 'cross river', 'ebonyi', 'edo', 'ekiti',
      'gombe', 'imo', 'jigawa', 'kebbi', 'kogi', 'kwara', 'nassarawa', 'niger', 'ondo', 'osun',
      'plateau', 'sokoto', 'taraba', 'yobe', 'zamfara'
    ];
    for (const part of addressParts) {
      for (const state of nigerianStates) {
        if (part.includes(state)) {
          return state.charAt(0).toUpperCase() + state.slice(1);
        }
      }
    }
    return null;
  };

  // Update shipping fee when address changes
  useEffect(() => {
    const state = extractStateFromAddress(address);
    const fee = state && shippingFees[state.toLowerCase()]
      ? shippingFees[state.toLowerCase()]
      : shippingFees['default'] || 5000;
    setShippingFee(fee);
  }, [address, shippingFees]);

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
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:focus:ring-blue-400 transition-colors"
        />
        <button
          id="clearSearch"
          class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Clear
        </button>
        <div
          id="searchResults"
          class="hidden bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-[1000]"
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
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Search failed:', response.status, errorText);
          throw new Error(`Search failed with status ${response.status}`);
        }
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
        toast.success('Address updated successfully!');
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
        toast.success('Address saved successfully!');
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
      toast.success('Address deleted successfully!');
    } catch (err) {
      setError('Failed to delete address: ' + err.message);
    }
  };

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

    if (typeof window === 'undefined' || !window.PaystackPop) {
      setError('Payment system is not ready. Please refresh the page.');
      setIsPaying(false);
      return;
    }

    if (cart.some(item => item.is_out_of_stock)) {
    setError('Cannot place order: some items are out of stock');
    return;
  }


    if (!address) {
      setError('Please enter or select a delivery address.');
      setIsPaying(false);
      return;
    }

    const state = extractStateFromAddress(address);
    if (!state && !shippingFees['default']) {
      setError('Unable to determine shipping fee for this address. Please ensure the address includes a valid Nigerian state.');
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
      const { data: orderData, error } = await supabase.from('orders').insert([
          {
            user_id: user.id,
            items,
            address,
            lat: parseFloat(lat),
            lng: parseFloat(lon),
            status: 'processing',
            total: totalPrice + shippingFee,
            shipping_fee: shippingFee,
            created_at: new Date().toISOString(),
            payment_reference: paymentReference,
          },
        ]).select().single();
        if (error) {
          console.error('Supabase insert error:', error.message, error.details, error.hint);
          throw error;
        }
        // // Generate the receipt PDF by calling the generate-receipt API
        // const receiptResponse = await fetch('/api/generate-receipt', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ order: { ...orderData, items: cart, address, total: totalPrice + shippingFee, shipping_fee: shippingFee }, user }),
        // });

        // let receiptUrl = '';
        // if (receiptResponse.ok) {
        //   const receiptData = await receiptResponse.json();
        //   receiptUrl = receiptData.url;
        // } else {
        //   console.error('Failed to generate receipt:', await receiptResponse.text());
        // }

        // Send the receipt email in a non-blocking manner
       fetch('/api/send-receipt-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: profile?.email || user.email,
    order: {
      ...orderData,
      items: cart,
      address,
      total: totalPrice + shippingFee,
      shipping_fee: shippingFee,
    },
    receiptUrl: '',
  }),
})
  .then((res) => res.json())
  .then((data) => {
    if (data.error) {
      console.error('Failed to send receipt email:', data.error);
    } else {
      console.log('Receipt email sent successfully');
    }
  })
  .catch((emailError) => {
    console.error('Failed to send receipt email:', emailError.message);
  });


        clearCart();
        router.push('/orders');
        toast.success('Payment successful! Order placed.');
      };

      const success = await initiatePayment({
        email: profile?.email || user.email,
        totalPrice: totalPrice + shippingFee,
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
  if (error && !isPaying) return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="p-6 text-center text-red-600 text-lg font-semibold">Error: {error}</p>
    </main>
  );
  if (cart.length === 0) return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-5xl mx-auto p-6 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-6">Checkout</h1>
        <p className="text-gray-600 text-lg">
          Your cart is empty.{' '}
          <Link href="/" className="text-blue-600 hover:underline font-semibold">
            Continue shopping
          </Link>.
        </p>
      </div>
    </main>
  );

  return (
    <>
      <Script
        src="https://js.paystack.co/v2/inline.js"
        strategy="afterInteractive"
        onLoad={() => console.log('Paystack SDK loaded successfully')}
        onError={(e) => {
          console.error('Paystack script failed to load:', e);
          setError('Failed to load payment system. Please try again later.');
        }}
      />
      <ToastContainer position="top-right" autoClose={3000} />
      <main className="min-h-screen bg-gray-50">
        <Navbar
          profile={profile}
          onCartClick={() => setIsCartOpen(true)}
          cartItemCount={cart.length}
        />
        <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Checkout</h1>
          <form onSubmit={handleOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Address and Payment */}
            <div className="lg:col-span-2 space-y-8">
              {/* Delivery Address Section */}
              <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Delivery Address</h2>
                {savedAddresses.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Saved Address
                    </label>
                    <select
                      value={selectedAddressId}
                      onChange={handleSavedAddressChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    >
                      <option value="">Select an address</option>
                      {savedAddresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>{addr.address}</option>
                      ))}
                    </select>
                    <div className="mt-4 space-y-3">
                      {savedAddresses.map((addr) => (
                        <div key={addr.id} className="flex justify-between items-center border-b border-gray-200 py-2">
                          <span className="text-gray-700">{addr.address}</span>
                          <div className="flex space-x-4">
                            <button
                              type="button"
                              onClick={() => handleEditAddress(addr)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isEditingAddress ? 'Edit Address' : 'Enter or Search Address'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter delivery address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {isEditingAddress ? 'Update Address' : 'Save Address'}
                </button>
                <div className="mt-6 h-96 w-full rounded-lg overflow-hidden border border-gray-200" ref={mapContainerRef}></div>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              </section>
            </div>

            {/* Right Column: Cart Summary and Payment */}
            <div className="lg:col-span-1">
              <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200 sticky top-4">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Order Summary</h2>
                <ul className="space-y-4 mb-6">
                  {cart.map((item) => (
                    <li
                      key={`${item.id}-${item.size || ''}-${item.color || ''}`}
                      className="flex items-center space-x-4 border-b border-gray-200 pb-4"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        loading="lazy"
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
                            <span className="text-blue-600">
                              ₦{Number(item.price).toLocaleString()}
                            </span>
                          )}
                        </p>
                        <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
                        {item.is_out_of_stock && <p className="text-red-600 text-sm font-medium">Out of Stock</p>}
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
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-gray-900 font-medium mb-2">
                    <span>Subtotal</span>
                    <span>₦{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-medium mb-2">
                    <span>Shipping</span>
                    <span>₦{shippingFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-bold text-lg">
                    <span>Total</span>
                    <span>₦{(totalPrice + shippingFee).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={!address || isPaying}
                >
                  {isPaying ? 'Processing...' : 'Confirm & Pay'}
                </button>
              </section>
            </div>
          </form>
        </div>
        <Footer />
      </main>
    </>
  );
}