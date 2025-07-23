import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Footer from '@/components/footer';
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import CartPanel from "@/components/CartPanel";
import DressLoader from '@/components/DressLoader';

export default function Category() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
        const [isCartOpen, setIsCartOpen] = useState(false);
    
    const { addToCart } = useCart();
        const { toggleWishlist, isInWishlist } = useWishlist();

    const { slug } = router.query;
    const [products, setProducts] = useState([]);
    const [filters, setFilters] = useState({ size: '', color: '', price: '' });

    useEffect(() => {
        async function fetchProducts() {
            let query = supabase.from('products').select('*').eq('category', slug);
            if (filters.size) query = query.eq('size', filters.size);
            if (filters.color) query = query.eq('color', filters.color);
            if (filters.price) query = query.lte('price', filters.price);
            const { data } = await query;
            setProducts(data || []);
        }
        if (slug) fetchProducts();
    }, [slug, filters]);

    const breadcrumbs = [
        { name: 'Home', href: '/' },
        { name: 'Shop', href: '/shop' },
        { name: slug.replace('-', ' ').toUpperCase(), href: `/category/${slug}` },
    ];

     // Fetch user profile
        useEffect(() => {
            async function fetchProfile() {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (user) {
                    const { data: profileData, error: profileError } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", user.id)
                        .maybeSingle();
                    if (!profileError) setProfile(profileData);
                    else console.error("Profile fetch error:", profileError.message);
                } else if (userError) console.error("User fetch error:", userError.message);
            }
            fetchProfile();
        }, []);

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-rose-50 bg-[url('/african-fabric.jpg')] bg-cover bg-center relative">
            <Navbar
                profile={profile}
                onCartClick={() => setIsCartOpen(true)}
                cartItemCount={useCart().cart.length}
            />
            <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

            <div className="flex flex-col p-6 max-w-7xl mx-auto">
                <nav className="flex items-center space-x-2 text-gray-600 mb-6">
                    {breadcrumbs.map((crumb, i) => (
                        <div key={crumb.href} className="flex items-center">
                            <Link href={crumb.href} className="hover:text-purple-700">
                                {crumb.name}
                            </Link>
                            {i < breadcrumbs.length - 1 && <span className="mx-2">&gt;</span>}
                        </div>
                    ))}
                </nav>
                <div className="flex flex-col md:flex-row gap-6">
                    <aside className="w-full md:w-1/4 bg-white/90 rounded-lg p-4 shadow-md">
                        <h2 className="text-xl font-bold text-purple-800 font-['Playfair_Display'] mb-4">Filters</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700">Size</label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    onChange={(e) => setFilters({ ...filters, size: e.target.value })}
                                >
                                    <option value="">All Sizes</option>
                                    <option value="S">Small</option>
                                    <option value="M">Medium</option>
                                    <option value="L">Large</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-700">Color</label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    onChange={(e) => setFilters({ ...filters, color: e.target.value })}
                                >
                                    <option value="">All Colors</option>
                                    <option value="Red">Red</option>
                                    <option value="Gold">Gold</option>
                                    <option value="Purple">Purple</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-700">Price</label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    onChange={(e) => setFilters({ ...filters, price: e.target.value })}
                                >
                                    <option value="">All Prices</option>
                                    <option value="50">Under $50</option>
                                    <option value="100">Under $100</option>
                                </select>
                            </div>
                        </div>
                    </aside>
                    <div className="w-full md:w-3/4">
                        <h1 className="text-3xl font-bold text-purple-800 font-['Playfair_Display'] mb-6">
                            {slug.replace('-', ' ').toUpperCase()}
                        </h1>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product) => (
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
            </div>
            <Footer />
        </main>
    );
}