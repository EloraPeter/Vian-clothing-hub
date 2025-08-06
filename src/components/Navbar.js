import Link from "next/link";
import { FaUser, FaShoppingCart, FaBell, FaSearch } from "react-icons/fa";
import { useCart } from "@/context/CartContext";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar({
  profile,
  onCartClick,
  cartItemCount,
  notifications = [],
}) {
  const router = useRouter();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const unreadCount = notifications.filter((notif) => !notif.read).length;
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef();

  // Close search if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setExpanded(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setSearchQuery]);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from("categories")
        .select("name, slug")
        .is("parent_id", null);
      setCategories(data || []);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchSuggestions() {
      if (searchQuery) {
        const { data } = await supabase
          .from("products")
          .select("id, name, image_url")
          .ilike("name", `%${searchQuery}%`)
          .limit(5);
        setSuggestions(data || []);
      } else {
        setSuggestions([]);
      }
    }
    fetchSuggestions();
  }, [searchQuery]);

  return (
    <nav className="bg-white shadow-md px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-50">
      <div className="flex justify-between items-center w-full sm:w-auto">
        <Link href="/" className="flex items-center space-x-2">
          <img
            src="/logo.svg"
            alt="Vian Clothing Hub Logo"
            className="h-10 sm:h-12 w-auto"
          />
        </Link>

        <div className="flex">
          {/* search icon */}
          <div
            ref={containerRef}
            className="relative flex items-center block lg:hidden"
            onClick={() => setExpanded(true)}
          >
            {/* Search Icon */}
            <FaSearch className="sm:hidden text-purple-700 cursor-pointer" />

            {/* Animated Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setExpanded(true)}
              placeholder="Search products..."
              className={`
          transition-all duration-300 ease-in-out
          ml-2
          rounded-lg
          text-black
          border border-gray-300
          focus:border-purple-700
          focus:outline-none
          text-sm sm:text-base
          ${expanded
                  ? "w-64 px-3 py-2 opacity-100 visible"
                  : "w-0 px-0 py-0 opacity-0 invisible"
                }
        `}
            />

            {/* Suggestions Dropdown */}
            {expanded && suggestions.length > 0 && (
              <div className="absolute top-0 left-0 right-0 mt-12 bg-white text-black shadow-lg rounded-lg w-64 max-h-64 overflow-y-auto z-50">
                {suggestions.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="flex items-center px-4 py-2 hover:bg-purple-100"
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded mr-2"
                    />
                    <span className="text-sm truncate">{product.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* hamburger menu */}
          <button
            className="sm:hidden text-purple-700 hover:text-purple-800"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={
                  isMobileMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16m-7 6h7"
                }
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`w-full sm:w-auto flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 ${isMobileMenuOpen ? "flex" : "hidden sm:flex"
          } mt-4 sm:mt-0`}
      >
        {/* search icon */}
        <div
          ref={containerRef}
          className="hidden sm:flex sm:relative items-center"
          onClick={() => setExpanded(true)}
        >
          {/* Search Icon */}
          <FaSearch className="text-purple-700 cursor-pointer" />

          {/* Animated Input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder="Search products..."
            className={`
          transition-all duration-300 ease-in-out
          ml-2
          rounded-lg
          text-black
          border border-gray-300
          focus:border-purple-700
          focus:outline-none
          text-sm sm:text-base
          ${expanded
                ? "w-64 px-3 py-2 opacity-100 visible"
                : "w-0 px-0 py-0 opacity-0 invisible"
              }
        `}
          />

          {/* Suggestions Dropdown */}
          {expanded && suggestions.length > 0 && (
            <div className="absolute top-0 left-0 right-0 mt-12 bg-white text-black shadow-lg rounded-lg w-64 max-h-64 overflow-y-auto z-50">
              {suggestions.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="flex items-center px-4 py-2 hover:bg-purple-100"
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded mr-2"
                  />
                  <span className="text-sm truncate">{product.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/shop"
          className="relative group text-purple-700 hover:text-purple-800 font-medium text-sm sm:text-base"
        >
          <span className="after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:w-0 after:bg-purple-700 group-hover:after:w-full after:transition-all after:duration-300 after:ease-in-out">
            Shop
          </span>
        </Link>

        <Link
          href="/custom-order"
          className="relative group text-purple-700 hover:text-purple-800 font-medium text-sm sm:text-base"
        >
          <span className="after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[2px] after:w-0 after:bg-purple-700 group-hover:after:w-full after:transition-all after:duration-300 after:ease-in-out">
            Custom Order
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative text-purple-700 hover:text-purple-300 transition-colors"
              aria-label="View notifications"
            >
              <FaBell className="text-lg sm:text-xl" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-purple-700 mb-2">
                    Notifications
                  </h3>
                  {notifications.length === 0 ? (
                    <p className="text-gray-600 text-sm">
                      No notifications available.
                    </p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-2 rounded-md mb-2 ${notif.read ? "bg-gray-100" : "bg-purple-50"
                          }`}
                      >
                        <p className="text-sm text-gray-700">{notif.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onCartClick}
            className="relative text-purple-700 hover:text-purple-400 transition-colors active:scale-90 transition-transform duration-150"
            aria-label="Open cart"
          >
            <FaShoppingCart className="text-lg sm:text-xl" />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-600 hover:text-purple-700 transition-colors"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                alt="User Avatar"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FaUser className="text-purple-800 text-base sm:text-lg hover:text-purple-400 transition-colors" />
              </div>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
