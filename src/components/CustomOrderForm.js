import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import Script from "next/script";
import "leaflet/dist/leaflet.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { initiatePayment } from "@/lib/payment";

export default function CustomOrderForm({ user, profile }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: "",
    email: profile?.email || "",
    phone: "",
    fabric: "",
    style: "",
    measurements: {
      bust: "",
      waist: "",
      hips: "",
      shoulder: "",
      length: "",
    },
    address: "",
    lat: null,
    lng: null,
    deposit: 5000,
    additional_notes: "",
    inspiration_image: null, // Added for image upload
  });
  const [showMeasurementGuide, setShowMeasurementGuide] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressId, setEditAddressId] = useState(null);
  const [mapCenter, setMapCenter] = useState([9.082, 8.6753]);
  const [marker, setMarker] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const mapRef = useRef();
  const mapContainerRef = useRef();

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({ ...prev, email: profile?.email || user.email }));
    async function fetchAddresses() {
      const { data: addresses, error } = await supabase
        .from("addresses")
        .select("id, address, lat, lng")
        .eq("user_id", user.id);
      if (error) {
        setMessage("Error fetching addresses: " + error.message);
      } else {
        setSavedAddresses(addresses || []);
        if (addresses.length > 0) {
          setSelectedAddressId(addresses[0].id);
          setForm((prev) => ({
            ...prev,
            address: addresses[0].address,
            lat: addresses[0].lat,
            lng: addresses[0].lng,
          }));
          setMapCenter([addresses[0].lat || 9.082, addresses[0].lng || 8.6753]);
        }
      }
    }
    fetchAddresses();
  }, [user, profile]);

  useEffect(() => {
    if (!mapContainerRef.current || typeof window === "undefined") return;

    let L;
    try {
      L = require("leaflet");
      const markerIcon = "/leaflet/marker-icon.png";
      const markerShadow = "/leaflet/marker-shadow.png";
      const DefaultIcon = L.icon({
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current).setView(mapCenter, 10);
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, © <a href="https://carto.com/attributions">CARTO</a>',
          }
        ).addTo(mapRef.current);

        if (
          savedAddresses.length > 0 &&
          savedAddresses[0].lat &&
          savedAddresses[0].lng
        ) {
          const initialMarker = L.marker([
            savedAddresses[0].lat,
            savedAddresses[0].lng,
          ]).addTo(mapRef.current);
          setMarker(initialMarker);
          mapRef.current.setView(
            [savedAddresses[0].lat, savedAddresses[0].lng],
            14
          );
        }
      }

      const searchControl = L.control({ position: "topleft" });
      searchControl.onAdd = () => {
        const div = L.DomUtil.create(
          "div",
          "leaflet-control-search flex space-x-2"
        );
        div.innerHTML = `
          <input
            type="text"
            id="searchInput"
            placeholder="Search for an address"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            id="clearSearch"
            class="bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300"
          >
            Clear
          </button>
          <div
            id="searchResults"
            class="hidden bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto z-[1000]"
          ></div>
        `;
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
      };
      searchControl.addTo(mapRef.current);

      const searchInput = document.getElementById("searchInput");
      const searchResultsDiv = document.getElementById("searchResults");
      const clearButton = document.getElementById("clearSearch");

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
          searchResultsDiv.style.display = "none";
          return;
        }
        try {
          const response = await fetch(
            `/api/geocode?query=${encodeURIComponent(query)}`
          );
          if (!response.ok) throw new Error("Search failed");
          const data = await response.json();
          setSearchResults(data);
          searchResultsDiv.style.display = data.length ? "block" : "none";
          searchResultsDiv.innerHTML = data
            .map(
              (result, index) => `
                <div
                  class="search-result px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-purple-600 cursor-pointer border-b border-gray-200 last:border-b-0"
                  data-index="${index}"
                >
                  ${result.display_name}
                </div>
              `
            )
            .join("");
          const resultElements =
            searchResultsDiv.querySelectorAll(".search-result");
          resultElements.forEach((el) => {
            el.addEventListener("click", () => {
              const index = el.getAttribute("data-index");
              const result = data[index];
              setForm((prev) => ({
                ...prev,
                address: result.display_name,
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
              }));
              setMapCenter([parseFloat(result.lat), parseFloat(result.lon)]);
              if (mapRef.current) {
                mapRef.current.setView(
                  [parseFloat(result.lat), parseFloat(result.lon)],
                  14
                );
                if (marker) {
                  marker.setLatLng([
                    parseFloat(result.lat),
                    parseFloat(result.lon),
                  ]);
                } else {
                  const newMarker = L.marker([
                    parseFloat(result.lat),
                    parseFloat(result.lon),
                  ]).addTo(mapRef.current);
                  setMarker(newMarker);
                }
              }
              setSelectedAddressId("");
              setIsEditingAddress(false);
              setEditAddressId(null);
              searchResultsDiv.style.display = "none";
              searchInput.value = result.display_name;
            });
          });
        } catch (err) {
          console.error("Search error:", err);
          setSearchResults([]);
          searchResultsDiv.style.display = "none";
          setMessage("Failed to search address. Please try again.");
        }
      }, 500);

      searchInput.addEventListener("input", (e) =>
        performSearch(e.target.value)
      );
      clearButton.addEventListener("click", () => {
        searchInput.value = "";
        setSearchResults([]);
        searchResultsDiv.style.display = "none";
      });

      mapRef.current.on("click", async (e) => {
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
          const response = await fetch(
            `/api/reverse-geocode?lat=${lat}&lng=${lng}`
          );
          if (!response.ok) throw new Error("Reverse geocoding failed");
          const data = await response.json();
          if (data.display_name) {
            setForm((prev) => ({
              ...prev,
              address: data.display_name,
              lat: parseFloat(lat),
              lng: parseFloat(lng),
            }));
            setSelectedAddressId("");
            setIsEditingAddress(false);
            setEditAddressId(null);
          }
        } catch (err) {
          setMessage("Failed to fetch address: " + err.message);
        }
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          setMarker(null);
        }
      };
    } catch (err) {
      setMessage("Failed to load map: " + err.message);
    }
  }, [mapCenter, savedAddresses]);

  const sendWhatsAppNotification = async (phone, text) => {
    const apiKey = "7165245";
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(text)}&apikey=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          "Failed to send WhatsApp notification:",
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error sending WhatsApp notification:", error);
    }
  };

  const createAdminNotification = async (message) => {
    const { data: adminProfiles, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_admin", true);

    if (error) {
      console.error("Error fetching admin profiles:", error.message);
      return;
    }

    if (adminProfiles) {
      for (const admin of adminProfiles) {
        await supabase.from("notifications").insert([
          {
            user_id: admin.id,
            message,
            created_at: new Date().toISOString(),
            read: false,
          },
        ]);
      }
    }
  };

  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      if (!form.full_name) newErrors.full_name = "Full name is required";
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        newErrors.email = "Valid email is required";
      if (!form.phone || !/^\+?\d{10,14}$/.test(form.phone))
        newErrors.phone = "Valid phone number is required";
    } else if (step === 2) {
      if (!form.fabric) newErrors.fabric = "Fabric is required";
      if (!form.style) newErrors.style = "Style is required";
      if (
        form.inspiration_image &&
        form.inspiration_image.size > 5 * 1024 * 1024
      ) {
        newErrors.inspiration_image = "Image size must be less than 5MB";
      }
      if (
        form.inspiration_image &&
        !["image/jpeg", "image/png"].includes(form.inspiration_image.type)
      ) {
        newErrors.inspiration_image = "Only JPEG or PNG images are allowed";
      }
    } else if (step === 3) {
      if (
        !form.measurements.bust ||
        isNaN(form.measurements.bust) ||
        form.measurements.bust <= 0
      )
        newErrors.bust = "Valid bust measurement is required";
      if (
        !form.measurements.waist ||
        isNaN(form.measurements.waist) ||
        form.measurements.waist <= 0
      )
        newErrors.waist = "Valid waist measurement is required";
      if (
        !form.measurements.hips ||
        isNaN(form.measurements.hips) ||
        form.measurements.hips <= 0
      )
        newErrors.hips = "Valid hips measurement is required";
    } else if (step === 4) {
      if (!form.address) newErrors.address = "Delivery address is required";
      if (!form.lat || !form.lng)
        newErrors.address = "Please select a valid address on the map";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (file) => {
    if (!file) return null;
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("inspiration-images")
        .upload(fileName, file);
      if (error) throw error;
      const { data: publicData } = supabase.storage
        .from("inspiration-images")
        .getPublicUrl(fileName);
      return publicData.publicUrl;
    } catch (err) {
      setMessage("Failed to upload image: " + err.message);
      toast.error("Failed to upload image: " + err.message);
      return null;
    }
  };

  const handleNext = async () => {
    if (validateStep()) {
      if (step === 2 && form.inspiration_image) {
        setLoading(true);
        const imageUrl = await handleImageUpload(form.inspiration_image);
        if (imageUrl) {
          setForm((prev) => ({ ...prev, inspiration_image: imageUrl }));
        } else {
          setLoading(false);
          return;
        }
        setLoading(false);
      }
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSaveAddress = async () => {
    if (!form.address) {
      setMessage("Please enter a valid address.");
      toast.error("Please enter a valid address.");
      return;
    }
    try {
      const response = await fetch(
        `/api/geocode?query=${encodeURIComponent(form.address)}`
      );
      const data = await response.json();
      if (!data[0]) {
        setMessage("Invalid address. Please enter a valid address.");
        toast.error("Invalid address. Please enter a valid address.");
        return;
      }
      const { lat, lon } = data[0];

      if (isEditingAddress && editAddressId) {
        const { error } = await supabase
          .from("addresses")
          .update({
            address: form.address,
            lat: parseFloat(lat),
            lng: parseFloat(lon),
          })
          .eq("id", editAddressId)
          .eq("user_id", user.id);
        if (error) throw error;
        setMessage("Address updated successfully!");
        toast.success("Address updated successfully!");
      } else {
        const { error } = await supabase
          .from("addresses")
          .insert([
            {
              user_id: user.id,
              address: form.address,
              lat: parseFloat(lat),
              lng: parseFloat(lon),
            },
          ]);
        if (error) throw error;
        setMessage("Address saved successfully!");
        toast.success("Address saved successfully!");
      }

      const { data: newAddresses } = await supabase
        .from("addresses")
        .select("id, address, lat, lng")
        .eq("user_id", user.id);
      setSavedAddresses(newAddresses || []);
      setSelectedAddressId(
        isEditingAddress
          ? editAddressId
          : newAddresses[newAddresses.length - 1].id
      );
      setForm((prev) => ({
        ...prev,
        lat: parseFloat(lat),
        lng: parseFloat(lon),
      }));
      setIsEditingAddress(false);
      setEditAddressId(null);
    } catch (err) {
      setMessage("Failed to save address: " + err.message);
      toast.error("Failed to save address: " + err.message);
    }
  };

  const handleEditAddress = (addr) => {
    setIsEditingAddress(true);
    setEditAddressId(addr.id);
    setForm((prev) => ({
      ...prev,
      address: addr.address,
      lat: addr.lat,
      lng: addr.lng,
    }));
    setMapCenter([addr.lat || 9.082, addr.lng || 8.6753]);
    if (mapRef.current) {
      mapRef.current.setView([addr.lat || 9.082, addr.lng || 8.6753], 14);
      if (marker) {
        marker.setLatLng([addr.lat, addr.lng]);
      } else {
        const L = require("leaflet");
        const newMarker = L.marker([addr.lat, addr.lng]).addTo(mapRef.current);
        setMarker(newMarker);
      }
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addressId)
        .eq("user_id", user.id);
      if (error) throw error;
      const { data: newAddresses } = await supabase
        .from("addresses")
        .select("id, address, lat, lng")
        .eq("user_id", user.id);
      setSavedAddresses(newAddresses || []);
      setSelectedAddressId(newAddresses.length > 0 ? newAddresses[0].id : "");
      setForm((prev) => ({
        ...prev,
        address: newAddresses.length > 0 ? newAddresses[0].address : "",
        lat: newAddresses.length > 0 ? newAddresses[0].lat : null,
        lng: newAddresses.length > 0 ? newAddresses[0].lng : null,
      }));
      setIsEditingAddress(false);
      setEditAddressId(null);
      if (newAddresses.length > 0 && newAddresses[0]) {
        setMapCenter([
          newAddresses[0].lat || 9.082,
          newAddresses[0].lng || 8.6753,
        ]);
        if (mapRef.current) {
          mapRef.current.setView(
            [newAddresses[0].lat || 9.082, newAddresses[0].lng || 8.6753],
            14
          );
          if (marker) {
            marker.setLatLng([newAddresses[0].lat, newAddresses[0].lng]);
          } else {
            const L = require("leaflet");
            const newMarker = L.marker([
              newAddresses[0].lat,
              newAddresses[0].lng,
            ]).addTo(mapRef.current);
            setMarker(newMarker);
          }
        }
      } else {
        setMapCenter([9.082, 8.6753]);
        if (marker) {
          marker.remove();
          setMarker(null);
        }
      }
      setMessage("Address deleted successfully!");
      toast.success("Address deleted successfully!");
    } catch (err) {
      setMessage("Failed to delete address: " + err.message);
      toast.error("Failed to delete address: " + err.message);
    }
  };

  const handleSavedAddressChange = (e) => {
    const addressId = e.target.value;
    setSelectedAddressId(addressId);
    const selected = savedAddresses.find((addr) => addr.id === addressId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        address: selected.address,
        lat: selected.lat,
        lng: selected.lng,
      }));
      setMapCenter([selected.lat || 9.082, selected.lng || 8.6753]);
      if (mapRef.current) {
        mapRef.current.setView(
          [selected.lat || 9.082, selected.lng || 8.6753],
          14
        );
        if (marker) {
          marker.setLatLng([selected.lat, selected.lng]);
        } else {
          const L = require("leaflet");
          const newMarker = L.marker([selected.lat, selected.lng]).addTo(
            mapRef.current
          );
          setMarker(newMarker);
        }
      }
      setIsEditingAddress(false);
      setEditAddressId(null);
    } else {
      setForm((prev) => ({ ...prev, address: "", lat: null, lng: null }));
      setMapCenter([9.082, 8.6753]);
      if (marker) {
        marker.remove();
        setMarker(null);
      }
      setIsEditingAddress(false);
      setEditAddressId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateStep() && step < 4) {
      if (step === 2 && form.inspiration_image) {
        setLoading(true);
        const imageUrl = await handleImageUpload(form.inspiration_image);
        if (imageUrl) {
          setForm((prev) => ({ ...prev, inspiration_image: imageUrl }));
        } else {
          setLoading(false);
          return;
        }
        setLoading(false);
      }
      setStep(step + 1);
    }
  };

  const handleConfirmOrder = async () => {
    if (step === 4 && validateStep()) {
      setShowConfirmation(true);
    }
  };

  const confirmOrder = async () => {
    setShowConfirmation(false);
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/geocode?query=${encodeURIComponent(form.address)}`
      );
      const data = await response.json();
      if (!data[0]) {
        setMessage("Invalid delivery address. Please select a valid address.");
        toast.error("Invalid delivery address. Please select a valid address.");
        setLoading(false);
        return;
      }
      const { lat, lon } = data[0];

      const placeOrder = async (paymentReference) => {
        const { error, data } = await supabase
          .from("custom_orders")
          .insert([
            {
              user_id: user.id,
              full_name: form.full_name,
              phone: form.phone,
              email: form.email,
              fabric: form.fabric,
              style: form.style,
              measurements: JSON.stringify(form.measurements),
              additional_notes: form.additional_notes,
              address: form.address,
              lat: parseFloat(lat),
              lng: parseFloat(lon),
              deposit: 5000,
              status: "pending",
              delivery_status: "not_started",
              created_at: new Date().toISOString(),
              payment_reference: paymentReference,
              inspiration_image: form.inspiration_image, // Added to store image URL
            },
          ])
          .select()
          .single();

        if (error) {
          console.error(
            "Supabase insert error:",
            error.message,
            error.details,
            error.hint
          );
          throw error;
        }

        const userNotificationText = `Your custom order has been submitted! Fabric: ${form.fabric}, Style: ${form.style}. A non-refundable deposit of ₦5,000 has been paid. Please check the app for updates: https://vianclothinghub.com`;
        await sendWhatsAppNotification(form.phone, userNotificationText);
        // Email Notification
        try {
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: form.email,
              subject: 'Vian Clothing Hub - Custom Order Confirmation',
              html: `
              <h1>Order Confirmation</h1>
              <p>Dear ${form.full_name},</p>
              <p>Your custom order has been successfully submitted!</p>
              <ul>
                <li><strong>Fabric:</strong> ${form.fabric}</li>
                <li><strong>Style:</strong> ${form.style}</li>
                <li><strong>Deposit:</strong> ₦5,000 (non-refundable)</li>
                ${form.inspiration_image ? `<li><strong>Inspiration Image:</strong> <a href="${form.inspiration_image}">View Image</a></li>` : ''}
              </ul>
              <p>Please check your dashboard for updates: <a href="https://vianclothinghub.com/dashboard">Vian Clothing Hub</a></p>
              <p>Thank you for choosing Vian Clothing Hub!</p>
            `,
            }),
          });
          if (!res.ok) {
            console.error('Failed to send email:', await res.text());
          }
        } catch (emailError) {
          console.error('Email error:', emailError.message);
          // Don't throw; let the order proceed even if email fails
        }

        const adminNotificationText =
          `📌 NEW CUSTOM ORDER

--------------------------
👤 Name: ${form.full_name}
🆔 Order ID: ${data.id}
📞 Phone: ${form.phone}
🧶 Fabric: ${form.fabric}
✂️ Style: ${form.style}
${form.inspiration_image ? `📸 Inspiration Image:\n${form.inspiration_image}` : "📸 Inspiration Image: Not provided"}
--------------------------

📍 Action: Please set the outfit price in the admin dashboard.`;
        await sendWhatsAppNotification("2348087522801", adminNotificationText);
        await createAdminNotification(adminNotificationText);
        router.push("/dashboard");
        toast.success("Payment successful! Order placed.");
      };

      const success = await initiatePayment({
        email: profile?.email || user.email,
        totalPrice: form.deposit,
        setError: setMessage,
        setIsPaying: setLoading,
        orderCallback: placeOrder,
        useApiFallback: true,
      });

      if (!success) {
        throw new Error("Payment initiation failed");
      }
    } catch (err) {
      console.error("Order error:", err.message);
      setMessage("Order failed: " + err.message);
      toast.error("Order failed: " + err.message);
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-between mb-8">
      {[
        "Personal Info",
        "Design Details",
        "Measurements",
        "Delivery & Review",
      ].map((label, index) => (
        <div
          key={index}
          className={`flex-1 text-center ${step >= index + 1 ? "text-purple-700" : "text-gray-400"}`}
        >
          <div
            className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${step >= index + 1 ? "bg-purple-700 text-white" : "bg-gray-200"}`}
          >
            {index + 1}
          </div>
          <p className="mt-2 text-sm font-medium">{label}</p>
        </div>
      ))}
    </div>
  );

  const renderMeasurementGuide = () => (
    <div className="bg-gray-100 p-4 rounded-lg mt-4">
      <button
        type="button"
        onClick={() => setShowMeasurementGuide(!showMeasurementGuide)}
        className="flex items-center text-purple-700 font-semibold"
      >
        {showMeasurementGuide ? (
          <ChevronUpIcon className="w-5 h-5 mr-2" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 mr-2" />
        )}
        How to Take Measurements
      </button>
      {showMeasurementGuide && (
        <div className="mt-4 text-sm text-gray-700">
          <p>
            To ensure your outfit fits perfectly, please take accurate
            measurements using a measuring tape. Follow these tips:
          </p>
          <ul className="list-disc pl-5 mt-2">
            <li>
              <strong>Bust:</strong> Measure around the fullest part of your
              bust, keeping the tape parallel to the floor.
            </li>
            <li>
              <strong>Waist:</strong> Measure around the narrowest part of your
              waist, typically above the navel.
            </li>
            <li>
              <strong>Hips:</strong> Measure around the fullest part of your
              hips, about 8 inches below the waist.
            </li>
            <li>
              <strong>Shoulder:</strong> Measure from the edge of one shoulder
              to the other across your back.
            </li>
            <li>
              <strong>Length:</strong> For dresses or skirts, measure from the
              top of the shoulder to the desired hemline.
            </li>
          </ul>
          <p className="mt-2">
            For best results, have someone assist you, and wear form-fitting
            clothing while measuring.
          </p>
          <div className="mt-4">
            <svg
              width="200"
              height="200"
              viewBox="0 0 200 200"
              className="mx-auto"
            >
              <rect x="80" y="20" width="40" height="120" fill="#e2e8f0" />
              <circle cx="100" cy="30" r="20" fill="#cbd5e1" />
              <path
                d="M80 60 L60 100 L80 140 M120 60 L140 100 L120 140"
                stroke="#6b7280"
                strokeWidth="2"
              />
              <text x="10" y="30" fontSize="12" fill="#6b7280">
                Shoulder
              </text>
              <text x="10" y="80" fontSize="12" fill="#6b7280">
                Bust
              </text>
              <text x="10" y="100" fontSize="12" fill="#6b7280">
                Waist
              </text>
              <text x="10" y="120" fontSize="12" fill="#6b7280">
                Hips
              </text>
              <text x="150" y="100" fontSize="12" fill="#6b7280">
                Length
              </text>
            </svg>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Script
        src="https://js.paystack.co/v2/inline.js"
        strategy="afterInteractive"
        onError={(e) => console.error("Paystack script failed to load:", e)}
      />
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="bg-white max-w-3xl mx-auto p-8 rounded-lg shadow-lg my-10">
        {renderStepIndicator()}
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          id="custom-order-form"
        >
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-purple-800">
                Personal Information
              </h2>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  className={`w-full text-gray-800 border p-3 rounded-lg ${errors.full_name ? "border-red-500" : "border-gray-300"} focus:ring-purple-500 focus:border-purple-500`}
                  required
                />
                <InformationCircleIcon
                  className="w-5 h-5 text-gray-400 absolute right-3 top-9"
                  title="Enter your full name as it appears on your ID"
                />
                {errors.full_name && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.full_name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  readOnly
                  className="w-full border p-3 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`w-full text-gray-800 border p-3 rounded-lg ${errors.phone ? "border-red-500" : "border-gray-300"} focus:ring-purple-500 focus:border-purple-500`}
                  required
                />
                <InformationCircleIcon
                  className="w-5 h-5 text-gray-400 absolute right-3 top-9"
                  title="Enter a valid phone number for WhatsApp notifications"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-purple-800">
                Design Details
              </h2>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  Fabric
                </label>
                <select
                  value={form.fabric}
                  onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                  className={`w-full text-gray-800 border p-3 rounded-lg ${errors.fabric ? "border-red-500" : "border-gray-300"} focus:ring-purple-500 focus:border-purple-500`}
                  required
                >
                  <option value="">Select Fabric</option>
                  <option value="Cotton">Cotton</option>
                  <option value="Silk">Silk</option>
                  <option value="Chiffon">Chiffon</option>
                  <option value="Ankara">Ankara</option>
                  <option value="Lace">Lace</option>
                  <option value="Adire">Adire</option>
                  <option value="Custom">Custom (Specify in Notes)</option>
                </select>
                <InformationCircleIcon
                  className="w-5 h-5 text-gray-400 absolute right-3 top-9"
                  title="Choose a fabric or specify your own in the notes"
                />
                {errors.fabric && (
                  <p className="text-red-500 text-sm mt-1">{errors.fabric}</p>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">
                  Style
                </label>
                <select
                  value={form.style}
                  onChange={(e) => setForm({ ...form, style: e.target.value })}
                  className={`w-full text-gray-800 border p-3 rounded-lg ${errors.style ? "border-red-500" : "border-gray-300"} focus:ring-purple-500 focus:border-purple-500`}
                  required
                >
                  <option value="">Select Style</option>
                  <option value="A-Line Dress">A-Line Dress</option>
                  <option value="Gown">Gown</option>
                  <option value="Skirt and Blouse">Skirt and Blouse</option>
                  <option value="Traditional Attire">Traditional Attire</option>
                  <option value="Suit">Suit</option>
                  <option value="Bubu">Bubu</option>
                  <option value="Kaftan">Kaftan</option>
                  <option value="Agbada">Agbada</option>
                  <option value="Custom">Custom (Specify in Notes)</option>
                </select>
                <InformationCircleIcon
                  className="w-5 h-5 text-gray-400 absolute right-3 top-9"
                  title="Choose a style or describe your custom design"
                />
                {errors.style && (
                  <p className="text-red-500 text-sm mt-1">{errors.style}</p>
                )}
              </div>
              <div className="relative space-y-2">
                <label
                  htmlFor="inspiration-image"
                  className="block text-sm font-medium text-gray-700"
                >
                  Inspiration Image (Optional)
                </label>
                <div className="relative flex items-center">
                  <input
                    id="inspiration-image"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) =>
                      setForm({ ...form, inspiration_image: e.target.files[0] })
                    }
                    className={`w-full text-gray-800 text-sm border rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-purple-50 file:text-purple-700 file:font-medium file:hover:bg-purple-100 file:cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${errors.inspiration_image ? "border-red-500" : "border-gray-300"
                      }`}
                  />
                  <InformationCircleIcon
                    className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
                    title="Upload a JPEG or PNG image (max 5MB) for design inspiration"
                    aria-hidden="true"
                  />
                </div>
                {errors.inspiration_image && (
                  <p className="text-red-500 text-xs mt-1">{errors.inspiration_image}</p>
                )}
                {form.inspiration_image && typeof form.inspiration_image === "string" && (
                  <div className="mt-3 flex items-center space-x-4">
                    <div className="relative group">
                      <img
                        src={form.inspiration_image}
                        alt="Inspiration Preview"
                        className="w-40 h-40 object-cover rounded-xl shadow-sm border border-gray-200 transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-opacity"></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, inspiration_image: null })}
                      className="text-sm text-red-600 font-medium hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1 transition-colors"
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Additional Notes
                </label>
                <textarea
                  value={form.additional_notes}
                  onChange={(e) =>
                    setForm({ ...form, additional_notes: e.target.value })
                  }
                  className="w-full text-gray-800 border p-3 rounded-lg border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="E.g., Add embroidery details, specific color preferences, or custom fabric/style details"
                />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-purple-800">
                Measurements
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    Bust (cm)
                  </label>
                  <input
                    type="number"
                    value={form.measurements.bust}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        measurements: {
                          ...form.measurements,
                          bust: e.target.value,
                        },
                      })
                    }
                    className={`w-full text-gray-800 border p-3 rounded-lg ${errors.bust ? "border-red-500" : "border-gray-300"} focus:ring-purple-500 focus:border-purple-500`}
                    required
                    min="1"
                  />
                  <InformationCircleIcon
                    className="w-5 h-5 text-gray-400 absolute right-3 top-9"
                    title="Measure around the fullest part of your bust"
                  />
                  {errors.bust && (
                    <p className="text-red-500 text-sm mt-1">{errors.bust}</p>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    Waist (cm)
                  </label>
                  <input
                    type="number"
                    value={form.measurements.waist}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        measurements: {
                          ...form.measurements,
                          waist: e.target.value,
                        },
                      })
                    }
                    className={`w-full text-gray-800 border p-3 rounded-lg ${errors.waist ? "border-red-500" : "border-gray-300"} focus:ring-purple-500 focus:border-purple-500`}
                    required
                    min="1"
                  />
                  <InformationCircleIcon
                    className="w-5 h-5 text-gray-400 absolute right-3 top-9"
                    title="Measure around the narrowest part of your waist"
                  />
                  {errors.waist && (
                    <p className="text-red-500 text-sm mt-1">{errors.waist}</p>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    Hips (cm)
                  </label>
                  <input
                    type="number"
                    value={form.measurements.hips}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        measurements: {
                          ...form.measurements,
                          hips: e.target.value,
                        },
                      })
                    }
                    className={`w-full text-gray-800 border p-3 rounded-lg ${errors.hips ? "border-red-500" : "border-gray-300"} focus:ring-purple-500 focus:border-purple-500`}
                    required
                    min="1"
                  />
                  <InformationCircleIcon
                    className="w-5 h-5 text-gray-400 absolute right-3 top-9"
                    title="Measure around the fullest part of your hips"
                  />
                  {errors.hips && (
                    <p className="text-red-500 text-sm mt-1">{errors.hips}</p>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    Shoulder (cm)
                  </label>
                  <input
                    type="number"
                    value={form.measurements.shoulder}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        measurements: {
                          ...form.measurements,
                          shoulder: e.target.value,
                        },
                      })
                    }
                    className="w-full text-gray-800 border p-3 rounded-lg border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                    min="1"
                  />
                  <InformationCircleIcon
                    className="w-5 h-5 text-gray-400 absolute right-3 top-9"
                    title="Measure from one shoulder edge to the other"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    Length (cm)
                  </label>
                  <input
                    type="number"
                    value={form.measurements.length}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        measurements: {
                          ...form.measurements,
                          length: e.target.value,
                        },
                      })
                    }
                    className="w-full text-gray-800 border p-3 rounded-lg border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                    min="1"
                  />
                  <InformationCircleIcon
                    className="w-5 h-5 text-gray-400 absolute right-3 top-9"
                    title="Measure from shoulder to desired hemline"
                  />
                </div>
              </div>
              {renderMeasurementGuide()}
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-purple-800">
                Delivery & Review
              </h2>
              {savedAddresses.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Saved Address
                  </label>
                  <select
                    value={selectedAddressId}
                    onChange={handleSavedAddressChange}
                    className="w-full text-gray-800 border p-3 rounded-lg border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select an address</option>
                    {savedAddresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.address}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="flex justify-between items-center border-b border-gray-200 pb-2"
                      >
                        <span className="text-gray-700">{addr.address}</span>
                        <div>
                          <button
                            onClick={() => handleEditAddress(addr)}
                            className="text-purple-600 hover:underline mr-4"
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
                <label className="block text-sm font-medium text-gray-700">
                  {isEditingAddress
                    ? "Edit Address"
                    : "Enter or Search Address"}
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className={`w-full text-gray-800 border p-3 rounded-lg ${errors.address ? "border-red-500" : "border-gray-300"} focus:ring-purple-500 focus:border-purple-500`}
                  placeholder="Enter delivery address"
                  required
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveAddress}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                {isEditingAddress ? "Update Address" : "Save Address"}
              </button>
              <div className="h-64 w-full mt-4" ref={mapContainerRef}></div>
              <div className="bg-gray-100 text-gray-800 p-4 rounded-lg mt-4">
                <h3 className="text-lg font-semibold text-purple-800">
                  Order Summary
                </h3>
                <p>
                  <strong>Full Name:</strong> {form.full_name}
                </p>
                <p>
                  <strong>Email:</strong> {form.email}
                </p>
                <p>
                  <strong>Phone:</strong> {form.phone}
                </p>
                <p>
                  <strong>Delivery Address:</strong>{" "}
                  {form.address || "Not selected"}
                </p>
                <p>
                  <strong>Fabric:</strong> {form.fabric}
                </p>
                <p>
                  <strong>Style:</strong> {form.style}
                </p>
                <p>
                  <strong>Measurements:</strong> Bust:{" "}
                  {form.measurements.bust || "-"}cm, Waist:{" "}
                  {form.measurements.waist || "-"}cm, Hips:{" "}
                  {form.measurements.hips || "-"}cm, Shoulder:{" "}
                  {form.measurements.shoulder || "-"}cm, Length:{" "}
                  {form.measurements.length || "-"}cm
                </p>
                <p>
                  <strong>Inspiration Image:</strong>{" "}
                  {form.inspiration_image &&
                    typeof form.inspiration_image === "string" ? (
                    <a
                      href={form.inspiration_image}
                      target="_blank"
                      className="text-purple-600 hover:underline"
                    >
                      View Image
                    </a>
                  ) : (
                    "None"
                  )}
                </p>
                <p>
                  <strong>Additional Notes:</strong>{" "}
                  {form.additional_notes || "None"}
                </p>
                <p>
                  <strong>Deposit:</strong> ₦{form.deposit}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-between mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="bg-gray-300 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-400"
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="bg-purple-700 text-white py-2 px-6 rounded-lg hover:bg-purple-800 disabled:bg-purple-400"
              >
                {loading ? "Uploading..." : "Next"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={loading}
                className="bg-purple-700 text-white py-2 px-6 rounded-lg hover:bg-purple-800 disabled:bg-purple-400"
              >
                {loading ? "Processing..." : "Confirm Order"}
              </button>
            )}
          </div>
          {message && (
            <p
              className={`text-center mt-4 text-sm ${message.includes("Error") || message.includes("failed") ? "text-red-600" : "text-green-700"}`}
            >
              {message}
            </p>
          )}
        </form>
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-xl font-semibold text-purple-800 mb-4">
                Confirm Your Order
              </h3>
              <p className="text-gray-700">
                A non-refundable ₦5,000 deposit is required to proceed. You will
                be redirected to the payment page.
              </p>
              <div className="flex justify-end mt-6 space-x-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmOrder}
                  className="bg-purple-700 text-white py-2 px-4 rounded-lg hover:bg-purple-800"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-purple-800">
            Order Timeline
          </h3>
          <p className="text-gray-600 mt-2">
            Your custom order will take approximately 2-4 weeks to process,
            depending on fabric availability and design complexity. You’ll
            receive updates via WhatsApp and in-app notifications.
          </p>
        </div>
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-purple-800">
            Frequently Asked Questions
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="font-medium text-gray-700">
                How long does it take to process a custom order?
              </p>
              <p className="text-gray-600">
                Custom orders typically take 2-4 weeks to process, depending on
                complexity and fabric availability.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">
                Is the deposit refundable?
              </p>
              <p className="text-gray-600">
                The ₦5,000 deposit is non-refundable but will be deducted from
                the final outfit cost.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">
                Can I provide my own fabric?
              </p>
              <p className="text-gray-600">
                Yes, you can specify your own fabric in the additional notes
                section or contact us for details.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">
                Can I upload an inspiration image?
              </p>
              <p className="text-gray-600">
                Yes, you can upload a JPEG or PNG image (max 5MB) in the Design
                Details step to share your design inspiration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
