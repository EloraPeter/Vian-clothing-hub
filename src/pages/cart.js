import { useCart } from "@/context/CartContext";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CartPage() {
  const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
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
      router.push("/auth"); // not logged in
    } else {
      router.push("/checkout"); // go to checkout page
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 mx-auto" />
          <p className="mt-4 text-lg text-gray-600 font-medium">Loading your cart...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">
          Your Shopping Cart
        </h1>

        {cart.length === 0 ? (
          <div className="text-center bg-white p-8 rounded-xl shadow-lg">
            <p className="text-xl text-gray-600 font-medium">Your cart is empty.</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-end mb-6">
              <button
                onClick={clearCart}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm font-medium"
              >
                Clear Cart
              </button>
            </div>

            <ul className="space-y-6">
              {cart.map((item) => (
                <li
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{item.name}</p>
                      <p className="text-gray-600">₦{item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                        >
                          –
                        </button>
                        <span className="text-lg font-medium w-12 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors duration-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-700 font-medium">
                    Total: ₦{(item.price * item.quantity).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-gray-200 pt-6 flex justify-between items-center">
              <p className="text-xl font-bold text-gray-900">
                Subtotal: ₦{total.toLocaleString()}
              </p>
              <button
                onClick={handleCheckout}
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 text-lg font-medium"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}