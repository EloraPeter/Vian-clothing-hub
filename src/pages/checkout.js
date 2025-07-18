
// import { useCart } from '@/context/CartContext';
// import { useEffect, useState } from 'react';
// import { supabase } from '@/lib/supabaseClient';
// import { useRouter } from 'next/router';
// import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
// import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';

// export default function CheckoutPage() {
//   const { cart, totalPrice, clearCart } = useCart();
//   const [address, setAddress] = useState('');
//   const [savedAddresses, setSavedAddresses] = useState([]);
//   const [selectedAddressId, setSelectedAddressId] = useState('');
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [mapCenter, setMapCenter] = useState({ lat: 9.0820, lng: 8.6753 }); // Default to Nigeria center
//   const [markerPosition, setMarkerPosition] = useState(null);
//   const router = useRouter();

//   // Google Maps API key (replace with your key)
//   const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

//   // Check session and fetch addresses
//   useEffect(() => {
//     async function fetchData() {
//       setLoading(true);
//       const { data: { session } } = await supabase.auth.getSession();
//       if (!session) {
//         router.push('/auth');
//       } else {
//         setUser(session.user);
//         // Fetch saved addresses
//         const { data: addresses, error: addressError } = await supabase
//           .from('addresses')
//           .select('id, address, lat, lng')
//           .eq('user_id', session.user.id);
//         if (addressError) {
//           setError(addressError.message);
//         } else {
//           setSavedAddresses(addresses || []);
//           if (addresses.length > 0) {
//             setSelectedAddressId(addresses[0].id);
//             setAddress(addresses[0].address);
//             setMapCenter({ lat: addresses[0].lat || 9.0820, lng: addresses[0].lng || 8.6753 });
//             setMarkerPosition(addresses[0].lat && addresses[0].lng ? { lat: addresses[0].lat, lng: addresses[0].lng } : null);
//           }
//         }
//       }
//       setLoading(false);
//     }
//     fetchData();
//   }, [router]);

//   // Handle address selection from autocomplete
//   const handleSelectAddress = async (selectedAddress) => {
//     setAddress(selectedAddress);
//     try {
//       const results = await geocodeByAddress(selectedAddress);
//       const latLng = await getLatLng(results[0]);
//       setMapCenter(latLng);
//       setMarkerPosition(latLng);
//     } catch (err) {
//       console.error('Geocode error:', err);
//     }
//   };

//   // Handle map click to select address
//   const handleMapClick = async (event) => {
//     const latLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
//     setMapCenter(latLng);
//     setMarkerPosition(latLng);
//     try {
//       const response = await fetch(
//         `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latLng.lat},${latLng.lng}&key=${GOOGLE_MAPS_API_KEY}`
//       );
//       const data = await response.json();
//       if (data.results[0]) {
//         setAddress(data.results[0].formatted_address);
//       }
//     } catch (err) {
//       console.error('Reverse geocode error:', err);
//     }
//   };

//   // Handle saved address selection
//   const handleSavedAddressChange = (e) => {
//     const addressId = e.target.value;
//     setSelectedAddressId(addressId);
//     const selected = savedAddresses.find((addr) => addr.id === addressId);
//     if (selected) {
//       setAddress(selected.address);
//       setMapCenter({ lat: selected.lat || 9.0820, lng: selected.lng || 8.6753 });
//       setMarkerPosition(selected.lat && selected.lng ? { lat: selected.lat, lng: selected.lng } : null);
//     }
//   };

//   // Save new address
//   const handleSaveAddress = async () => {
//     if (!address) {
//       alert('Please enter an address.');
//       return;
//     }
//     try {
//       const results = await geocodeByAddress(address);
//       const latLng = await getLatLng(results[0]);
//       const { error } = await supabase.from('addresses').insert([
//         {
//           user_id: user.id,
//           address,
//           lat: latLng.lat,
//           lng: latLng.lng,
//         },
//       ]);
//       if (error) throw error;
//       const { data: newAddresses } = await supabase
//         .from('addresses')
//         .select('id, address, lat, lng')
//         .eq('user_id', user.id);
//       setSavedAddresses(newAddresses || []);
//       setSelectedAddressId(newAddresses[newAddresses.length - 1].id);
//       alert('Address saved successfully!');
//     } catch (err) {
//       alert('Failed to save address: ' + err.message);
//     }
//   };

//   // Place order
//   const handleOrder = async () => {
//     if (!address) {
//       alert('Please enter or select a delivery address.');
//       return;
//     }
//     try {
//       const { error } = await supabase.from('orders').insert([
//         {
//           user_id: user.id,
//           items: cart.map(item => ({
//             id: item.id,
//             name: item.name,
//             price: item.price,
//             quantity: item.quantity,
//             discount_percentage: item.discount_percentage || 0,
//             image_url: item.image_url,
//           })),
//           address,
//           status: 'awaiting payment',
//           total: totalPrice,
//         },
//       ]);
//       if (error) throw error;
//       clearCart();
//       router.push('/dashboard');
//     } catch (err) {
//       alert('Order failed: ' + err.message);
//     }
//   };

//   if (loading) return <p className="p-6 text-center text-gray-600">Loading...</p>;
//   if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;
//   if (cart.length === 0) return (
//     <main className="p-6 max-w-5xl mx-auto">
//       <h1 className="text-2xl font-bold mb-4 text-purple-700">Checkout</h1>
//       <p className="text-gray-600">Your cart is empty. <a href="/" className="text-purple-600 hover:underline">Continue shopping</a>.</p>
//     </main>
//   );

//   return (
//     <main className="p-6 max-w-5xl mx-auto">
//       <h1 className="text-3xl font-bold mb-6 text-purple-700 text-center">Checkout</h1>

//       {/* Cart Summary */}
//       <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
//         <h2 className="text-2xl font-bold text-purple-700 mb-4">Cart Summary</h2>
//         <ul className="space-y-4">
//           {cart.map((item) => (
//             <li key={item.id} className="flex items-center space-x-4 border-b border-gray-300 pb-4">
//               <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
//               <div className="flex-1">
//                 <p className="text-gray-700 font-medium">{item.name}</p>
//                 <p className="text-gray-600">
//                   {item.discount_percentage > 0 ? (
//                     <span>
//                       <span className="text-red-600 line-through">₦{Number(item.price).toLocaleString()}</span>{' '}
//                       <span className="text-green-600">
//                         ₦{(item.price * (1 - item.discount_percentage / 100)).toLocaleString()}
//                       </span>
//                     </span>
//                   ) : (
//                     <span className="text-purple-700">₦{Number(item.price).toLocaleString()}</span>
//                   )}
//                 </p>
//                 <p className="text-gray-600">Quantity: {item.quantity}</p>
//                 {item.is_out_of_stock && <p className="text-red-600 text-sm">Out of Stock</p>}
//               </div>
//               <p className="text-gray-700 font-medium">
//                 Total: ₦{((item.discount_percentage > 0 ? item.price * (1 - item.discount_percentage / 100) : item.price) * item.quantity).toLocaleString()}
//               </p>
//             </li>
//           ))}
//         </ul>
//         <p className="text-xl font-bold text-purple-700 mt-4">Subtotal: ₦{totalPrice.toLocaleString()}</p>
//       </section>

//       {/* Delivery Address */}
//       <section className="mb-8 bg-white p-6 rounded-xl shadow-md">
//         <h2 className="text-2xl font-bold text-purple-700 mb-4">Delivery Address</h2>
//         {savedAddresses.length > 0 && (
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Select Saved Address</label>
//             <select
//               value={selectedAddressId}
//               onChange={handleSavedAddressChange}
//               className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
//             >
//               <option value="">Select an address</option>
//               {savedAddresses.map((addr) => (
//                 <option key={addr.id} value={addr.id}>{addr.address}</option>
//               ))}
//             </select>
//           </div>
//         )}
//         <PlacesAutocomplete value={address} onChange={setAddress} onSelect={handleSelectAddress}>
//           {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
//             <div className="mb-4">
//               <label className="block text-sm font-medium text-gray-700 mb-1">Enter or Search Address</label>
//               <input
//                 {...getInputProps({
//                   placeholder: 'Enter delivery address',
//                   className: 'w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500',
//                 })}
//               />
//               <div className="mt-1">
//                 {loading && <p className="text-gray-600">Loading suggestions...</p>}
//                 {suggestions.map((suggestion) => (
//                   <div
//                     {...getSuggestionItemProps(suggestion, {
//                       className: `p-2 cursor-pointer ${suggestion.active ? 'bg-purple-50 text-purple-700' : 'bg-white text-gray-700'} hover:bg-purple-100`,
//                     })}
//                     key={suggestion.placeId}
//                   >
//                     {suggestion.description}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </PlacesAutocomplete>
//         <button
//           onClick={handleSaveAddress}
//           className="mb-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple riconosciuto


import { useCart } from '@/context/CartContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';

export default function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 9.0820, lng: 8.6753 }); // Default to Nigeria center
  const [markerPosition, setMarkerPosition] = useState(null);
  const router = useRouter();

  // Google Maps API key (replace with your key)
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
            setMapCenter({ lat: addresses[0].lat || 9.0820, lng: addresses[0].lng || 8.6753 });
            setMarkerPosition(addresses[0].lat && addresses[0].lng ? { lat: addresses[0].lat, lng: addresses[0].lng } : null);
          }
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  // Handle address selection from autocomplete
  const handleSelectAddress = async (selectedAddress) => {
    setAddress(selectedAddress);
    try {
      const results = await geocodeByAddress(selectedAddress);
      const latLng = await getLatLng(results[0]);
      setMapCenter(latLng);
      setMarkerPosition(latLng);
    } catch (err) {
      console.error('Geocode error:', err);
    }
  };

  // Handle map click to select address
  const handleMapClick = async (event) => {
    const latLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setMapCenter(latLng);
    setMarkerPosition(latLng);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latLng.lat},${latLng.lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results[0]) {
        setAddress(data.results[0].formatted_address);
        setSelectedAddressId(''); // Clear saved address selection
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  };

  // Handle saved address selection
  const handleSavedAddressChange = (e) => {
    const addressId = e.target.value;
    setSelectedAddressId(addressId);
    const selected = savedAddresses.find((addr) => addr.id === addressId);
    if (selected) {
      setAddress(selected.address);
      setMapCenter({ lat: selected.lat || 9.0820, lng: selected.lng || 8.6753 });
      setMarkerPosition(selected.lat && selected.lng ? { lat: selected.lat, lng: selected.lng } : null);
    } else {
      setAddress('');
      setMarkerPosition(null);
    }
  };

  // Save new address
  const handleSaveAddress = async () => {
    if (!address) {
      alert('Please enter an address.');
      return;
    }
    try {
      const results = await geocodeByAddress(address);
      const latLng = await getLatLng(results[0]);
      const { error } = await supabase.from('addresses').insert([
        {
          user_id: user.id,
          address,
          lat: latLng.lat,
          lng: latLng.lng,
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
          items: cart.map(item => ({
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
      <p className="text-gray-600">Your cart is empty. <a href="/" className="text-purple-600 hover:underline">Continue shopping</a>.</p>
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
        <PlacesAutocomplete value={address} onChange={setAddress} onSelect={handleSelectAddress}>
          {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter or Search Address</label>
              <input
                {...getInputProps({
                  placeholder: 'Enter delivery address',
                  className: 'w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500',
                })}
              />
              <div className="mt-1">
                {loading && <p className="text-gray-600">Loading suggestions...</p>}
                {suggestions.map((suggestion) => (
                  <div
                    {...getSuggestionItemProps(suggestion, {
                      className: `p-2 cursor-pointer ${suggestion.active ? 'bg-purple-50 text-purple-700' : 'bg-white text-gray-700'} hover:bg-purple-100`,
                    })}
                    key={suggestion.placeId}
                  >
                    {suggestion.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </PlacesAutocomplete>
        <button
          onClick={handleSaveAddress}
          className="mb-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          Save Address
        </button>
        <div className="h-64 w-full">
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
            <GoogleMap
              mapContainerStyle={{ height: '100%', width: '100%' }}
              center={mapCenter}
              zoom={10}
              onClick={handleMapClick}
            >
              {markerPosition && <Marker position={markerPosition} />}
            </GoogleMap>
          </LoadScript>
        </div>
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
