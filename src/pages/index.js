import Link from 'next/link';
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Footer from '@/components/footer';
import CartPanel from "@/components/CartPanel";
import DressLoader from '@/components/DressLoader';


export default function Home() {
    const [loading, setLoading] = useState(true);

    const categories = [
        { name: 'Women’s Clothing', slug: 'womens-clothing', image: '/womens-clothing.jpg' },
        { name: 'Men’s Clothing', slug: 'mens-clothing', image: '/mens-clothing.jpg' },
        { name: 'Accessories', slug: 'accessories', image: '/accessories.jpg' },
    ];

    const newArrivals = [
        { id: 1, name: 'Ankara Dress', price: 89.99, image: '/ankara-dress.jpg' },
        { id: 2, name: 'Kente Shirt', price: 59.99, image: '/kente-shirt.jpg' },
    ];

    if (loading) return <DressLoader />;


    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-rose-50 bg-[url('/african-fabric.jpg')] bg-cover bg-center relative">
            <Navbar
                profile={profile}
                onCartClick={() => setIsCartOpen(true)}
                cartItemCount={useCart().cart.length}
            />
            <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

            <div className="flex flex-col items-center justify-center p-6">
                <div className="relative w-full max-w-5xl bg-white/90 rounded-2xl shadow-2xl p-8 text-center animate-fade-in mb-12">
                    <div className="absolute inset-0 bg-gray-900/30 rounded-2xl -z-10" />
                    <h1 className="text-5xl font-extrabold text-purple-800 font-['Playfair_Display'] tracking-wide mb-4">
                        Welcome to Vian Clothing Hub
                    </h1>
                    <p className="text-lg text-gray-700 mb-6">
                        Discover vibrant African fashion that celebrates style and culture.
                    </p>
                    <Link
                        href="/shop"
                        className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        Shop Now
                    </Link>
                </div>
                <div className="w-full max-w-5xl">
                    <h2 className="text-3xl font-bold text-purple-800 font-['Playfair_Display'] mb-6">Shop by Category</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((category) => (
                            <Link
                                key={category.slug}
                                href={`/category/${category.slug}`}
                                className="relative bg-white/80 rounded-lg shadow-md p-4 hover:scale-105 transition-all duration-300"
                            >
                                <img src={category.image} alt={category.name} className="w-full h-48 object-cover rounded-lg" />
                                <h3 className="text-xl font-semibold text-gray-800 mt-2">{category.name}</h3>
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="w-full max-w-5xl mt-12">
                    <h2 className="text-3xl font-bold text-purple-800 font-['Playfair_Display'] mb-6">New Arrivals</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {newArrivals.map((product) => (
                            <Link
                                key={product.id}
                                href={`/product/${product.id}`}
                                className="relative bg-white/80 rounded-lg shadow-md p-4 hover:scale-105 transition-all duration-300"
                            >
                                <img src={product.image} alt={product.name} className="w-full h-48 object-cover rounded-lg" />
                                <h3 className="text-xl font-semibold text-gray-800 mt-2">{product.name}</h3>
                                <p className="text-gray-600">${product.price.toFixed(2)}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}