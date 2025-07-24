import Link from 'next/link';
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Footer from '@/components/footer';
import CartPanel from "@/components/CartPanel";
import Head from 'next/head';
import DressLoader from '@/components/DressLoader';


export default function Home() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
const { addToCart, cart } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const { toggleWishlist, isInWishlist } = useWishlist();
    const [categories, setCategories] = useState([]);
    const [newArrivals, setNewArrivals] = useState([]);

    // Fetch user profile
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            // Fetch user profile
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('email, avatar_url')
                    .eq('id', user.id)
                    .maybeSingle();
                setProfile(profileData);
            }

            // Fetch categories
            const { data: categoriesData } = await supabase
                .from('categories')
                .select('name, slug')
                .is('parent_id', null); // Top-level categories
            setCategories(categoriesData || []);

            // Fetch new arrivals
            const { data: productsData } = await supabase
                .from('products')
                .select('id, name, image_url, price, is_on_sale, discount_percentage, is_out_of_stock')
                .eq('is_new', true)
                .limit(8);
            setNewArrivals(productsData || []);
            setLoading(false);
        }
        fetchData();
    }, []);

    if (loading) return <DressLoader />;


    return (
        <main className="min-h-screen mb-0 bg-gray-100 pb-0 relative">
            <Navbar
                profile={profile}
                onCartClick={() => setIsCartOpen(true)}
                cartItemCount={useCart().cart.length}
            />
            <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

            <Head>
                <title>Vian Clothing Hub - Nigeria’s Ultimate Fashion Destination</title>
                <meta name="description" content="Shop trendy African and contemporary fashion at Vian Clothing Hub. Discover dresses, tops, accessories, and custom orders with nationwide delivery." />
            </Head>
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Hero Banner */}
                <section className="relative text-center py-20 mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-purple-800 font-playfair-display">
                        Welcome to Vian Clothing Hub
                    </h1>
                    <p className="text-lg text-black mt-4">
                        Discover Nigeria’s Finest Fashion – Trendy, Authentic, Affordable
                    </p>
                    <Link href="/shop" className="mt-6 inline-block bg-gold-500 text-purple-800 font-semibold px-8 py-3 rounded-lg hover:bg-gold-600 transition-colors"
                    >
                        Shop Now

                    </Link>
                </section>

                {/* Category Tiles */}
                <section className="mb-12">
                    <h2 className="text-3xl font-bold text-purple-800 font-playfair-display text-center mb-8">
                        Shop by Category
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {categories.map((category) => (
                            <Link key={category.slug} href={`/category/${category.slug}`} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-purple-200">

                                <h3 className="text-xl font-semibold text-purple-700">{category.name}</h3>

                            </Link>
                        ))}
                    </div>
                </section>

                {/* New Arrivals */}
                <section>
                    <h2 className="text-3xl font-bold text-purple-800 font-playfair-display text-center mb-8">
                        New Arrivals
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {newArrivals.map((product) => (
                            <Link key={product.id} href={`/product/${product.id}`} className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100">

                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-48 object-cover rounded-lg mb-4"
                                />
                                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                                <p className="text-purple-700 font-semibold">
                                    {product.is_on_sale ? (
                                        <>
                                            <span className="line-through text-red-600">₦{Number(product.price).toLocaleString()}</span>
                                            <span className="ml-2 text-green-600">
                                                ₦{(product.price * (1 - product.discount_percentage / 100)).toLocaleString()}
                                            </span>
                                        </>
                                    ) : (
                                        `₦${Number(product.price).toLocaleString()}`
                                    )}
                                </p>
                                {product.is_out_of_stock && (
                                    <span className="text-red-600 text-sm">Out of Stock</span>
                                )}

                            </Link>
                        ))}
                    </div>
                </section>
            </div>

            <Footer />
        </main>
    );
}