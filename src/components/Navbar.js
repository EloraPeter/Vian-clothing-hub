import Link from 'next/link';
import { FaShoppingCart, FaBell } from 'react-icons/fa';
import { useCart } from '@/context/CartContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function Navbar({ profile, onCartClick, cartItemCount, notifications = [] }) {
  const router = useRouter();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const unreadCount = notifications.filter((notif) => !notif.read).length;

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('categories')
        .select('name, slug')
        .is('parent_id', null);
      setCategories(data || []);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchSuggestions() {
      if (searchQuery) {
        const { data } = await supabase
          .from('products')
          .select('id, name, image_url')
          .ilike('name', `%${searchQuery}%`)
          .limit(5);
        setSuggestions(data || []);
      } else {
        setSuggestions([]);
      }
    }
    fetchSuggestions();
  }, [searchQuery]);

  return (
    <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center sticky top-0 z-50">
      <Link href="/" className="flex items-center space-x-2">
        <img src="/logo.svg" alt="Vian Clothing Hub Logo" className="h-15 w-auto" />
      </Link>

      <div className="flex items-center space-x-6">
        <div className="relative group">
          <button className="text-white hover:text-gold-500">Categories</button>
          <div className="absolute hidden group-hover:block bg-white text-gray-800 shadow-lg rounded-lg mt-2">
            {categories.map((category) => (
              <Link key={category.slug} href={`/category/${category.slug}`} className="block px-4 py-2 hover:bg-purple-100">
                {category.name}
              </Link>
            ))}
          </div>
        </div>
        <Link href="/shop" className="text-black hover:text-purple-500">Shop</Link>
        <Link href="/custom-order" className="text-black hover:text-purple-500">Custom Order</Link>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 rounded-lg text-black"
          />
          {suggestions.length > 0 && (
            <div className="absolute bg-white text-black shadow-lg rounded-lg mt-2 w-64">
              {suggestions.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} className="flex items-center px-4 py-2 hover:bg-purple-100">
                  <img src={product.image_url} alt={product.name} className="w-10 h-10 object-cover rounded mr-2" />
                  <span>{product.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>



        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative text-purple-700 hover:text-purple-800 transition-colors"
              aria-label="View notifications"
            >
              <FaBell className="text-xl" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-purple-700 mb-2">Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="text-gray-600 text-sm">No notifications available.</p>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-2 rounded-md mb-2 ${notif.read ? 'bg-gray-100' : 'bg-purple-50'}`}
                      >
                        <p className="text-sm text-gray-700">{notif.message}</p>
                        <p className="text-xs text-gray-500">{new Date(notif.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onCartClick}
            className="relative text-purple-700 hover:text-purple-800 transition-colors"
            aria-label="Open cart"
          >
            <FaShoppingCart className="text-xl" />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-purple-700 transition-colors"
          >
            <img
              src={profile?.avatar_url || '/default-avatar.png'}
              className="w-8 h-8 rounded-full object-cover"
              alt="User Avatar"
            />
          </button>
        </div>
      </div>
    </nav>
  );
}