import Link from 'next/link';
import { FaShoppingCart } from 'react-icons/fa';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/router';

export default function Navbar({ profile, onCartClick, cartItemCount }) {
  const router = useRouter();

  return (
    <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center sticky top-0 z-50">
      <Link href="/" className="text-xl font-bold text-purple-700">Aunty Nwanne</Link>

      <div className="flex-1 mx-4">
        <input
          type="text"
          placeholder="Search for fabric or style..."
          className="text-gray-600 w-full border px-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="flex items-center gap-4">
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
