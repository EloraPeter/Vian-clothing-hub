import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
    };
    fetchUser();
  }, []);


  const handleCheckout = () => {
    if (!user) {
      router.push('/auth'); // not logged in
    } else {
      router.push('/checkout'); // go to checkout page
    }
  };

  if (loading) {
    return (
      <main className="p-6 max-w-3xl mx-auto text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4">Loading your cart...</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      
      
      
      <button
        onClick={clearCart}
        className="mb-4 bg-red-500 text-white px-4 py-2 rounded"
      >
        Clear Cart
      </button>


     {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <button
            onClick={clearCart}
            className="mb-4 bg-red-500 text-white px-4 py-2 rounded"
          >
            Clear Cart
          </button>

          <ul className="space-y-4">
            {cart.map((item) => (
              <li key={item.id} className="border p-4 rounded shadow">
                <p className="font-semibold">{item.name}</p>
                <p>₦{item.price}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity - 1)
                    }
                    className="bg-gray-200 px-2 py-1 rounded"
                  >
                    –
                  </button>
                  <span className="font-medium">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1)
                    }
                    className="bg-gray-200 px-2 py-1 rounded"
                  >
                    +
                  </button>
                </div>
                <p className="mt-2">Total: ₦{item.price * item.quantity}</p>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-600 text-sm mt-1"
                >
                  Remove Item
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-6 font-bold">Subtotal: ₦{total}</p>
          <button
            onClick={handleCheckout}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded"
          >
            Checkout
          </button>
        </>
      )}
    </main>
  );
}
