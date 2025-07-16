import { useCart } from '@/context/CartContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const [address, setAddress] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/auth');
      else setUser(data.session.user);
    });
  }, [router]);

  const handleOrder = async () => {
    const { error } = await supabase.from('orders').insert([
      {
        user_id: user.id,
        items: cart,
        address,
        status: 'awaiting payment',
        total: cart.reduce((sum, i) => sum + i.price, 0),
      },
    ]);

    if (!error) {
      clearCart();
      router.push('/dashboard'); // redirect after successful order
    }
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      <textarea
        placeholder="Enter delivery address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="w-full border p-2 rounded mb-4"
      />

      <button
        onClick={handleOrder}
        className="bg-purple-700 text-white px-6 py-2 rounded"
      >
        Confirm & Place Order
      </button>
    </main>
  );
}
