import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CartPage() {
  const { cart, removeFromCart } = useCart();
  const [user, setUser] = useState(null);
  const router = useRouter();

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
  }, []);

  const handleCheckout = () => {
    if (!user) {
      router.push('/auth'); // not logged in
    } else {
      router.push('/checkout'); // go to checkout page
    }
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>

      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {cart.map((item, index) => (
              <li key={index} className="border p-4 rounded shadow">
                <p className="font-semibold">{item.name}</p>
                <p>₦{item.price}</p>
                <button
                  onClick={() => removeFromCart(index)}
                  className="text-red-600 text-sm"
                >
                  Remove
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
