import { useCart } from "@/context/CartContext";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CartPanel({ isOpen, onClose }) {
    const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const total = cart.reduce(
        (sum, item) =>
            sum +
            (item.discount_percentage > 0
                ? item.price * (1 - item.discount_percentage / 100)
                : item.price) *
            item.quantity,
        0
    );

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
            router.push("/auth");
        } else {
            router.push("/checkout");
        }
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 opacity-25 z-40 transition-opacity duration-300"
                    onClick={onClose}
                />
            )}
            {/* Slide-in Panel */}
            <div
                className={`fixed top-0 right-0 lg:w-96 w-full h-full lg:h-full md:bottom-0 md:top-auto md:h-3/4 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
                    isOpen
                        ? "translate-x-0 md:translate-y-0"
                        : "translate-x-full md:translate-y-full"
                }`}
            >
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center p-6 border-b border-gray-200">
                        <h2 className="text-2xl font-extrabold text-purple-800">
                            Your Shopping Cart
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            aria-label="Close cart"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-purple-500 mx-auto" />
                                <p className="mt-4 text-lg text-gray-600 font-medium">
                                    Loading your cart...
                                </p>
                            </div>
                        </div>
                    ) : cart.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-6">
                            <div className="text-center">
                                <p className="text-xl text-gray-600 font-medium">
                                    Your cart is empty.
                                </p>
                                <button
                                    onClick={() => {
                                        router.push("/");
                                        onClose();
                                    }}
                                    className="mt-4 inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200"
                                >
                                    Continue Shopping
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={clearCart}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
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
                                                <div className="flex items-center space-x-4">
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                                                    />
                                                    <div>
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-gray-600">
                                                            {item.discount_percentage > 0 ? (
                                                                <span>
                                                                    <span className="text-red-600 line-through">
                                                                        ₦{Number(item.price).toLocaleString()}
                                                                    </span>{" "}
                                                                    <span className="text-green-600">
                                                                        ₦{(item.price * (1 - item.discount_percentage / 100)).toLocaleString()}
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span>
                                                                    ₦{Number(item.price).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </p>
                                                        {item.is_out_of_stock && (
                                                            <p className="text-red-600 text-sm font-medium">
                                                                Out of Stock
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.id,
                                                                    item.quantity - 1
                                                                )
                                                            }
                                                            className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                                                            disabled={item.is_out_of_stock}
                                                        >
                                                            –
                                                        </button>
                                                        <span className="text-lg font-medium w-12 text-center">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.id,
                                                                    item.quantity + 1
                                                                )
                                                            }
                                                            className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                                                            disabled={item.is_out_of_stock}
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
                                                Total: ₦
                                                {(
                                                    (item.discount_percentage > 0
                                                        ? item.price *
                                                        (1 - item.discount_percentage / 100)
                                                        : item.price) * item.quantity
                                                ).toLocaleString()}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="border-t border-gray-200 p-6">
                                <div className="flex justify-between items-center">
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
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
