import Link from 'next/link';
import { FaShoppingCart, FaBell } from 'react-icons/fa';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Navbar({ profile, onCartClick, cartItemCount, notifications = [] }) {
  const router = useRouter();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const unreadCount = notifications.filter((notif) => !notif.read).length;

  return (
    <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center sticky top-0 z-50">
      <Link href="/" className="flex items-center space-x-2">
        <img src="/logo.svg" alt="Aunty Nwanne Logo" className="h-15 w-auto" />
      </Link>

      <div className="flex-1 mx-4">
        <input
          type="text"
          placeholder="Search for fabric or style..."
          className="text-gray-600 w-full border px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
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
    </nav>
  );
}