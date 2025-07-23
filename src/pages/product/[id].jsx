import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Footer from '@/components/footer';
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import CartPanel from "@/components/CartPanel";
import DressLoader from '@/components/DressLoader';

export default function Product() {
    const router = useRouter();
    const { id } = router.query;
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const { addToCart } = useCart();
        const { toggleWishlist, isInWishlist } = useWishlist();

    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [relatedItems, setRelatedItems] = useState([]);
    const [frequentlyBought, setFrequentlyBought] = useState([]);
    const [mainImage, setMainImage] = useState('');

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

    useEffect(() => {
        async function fetchProduct() {
            const { data: productData } = await supabase.from('products').select('*').eq('id', id).single();
            setProduct(productData);
            setMainImage(productData?.images[0] || '');

            const { data: reviewData } = await supabase.from('reviews').select('*').eq('product_id', id);
            setReviews(reviewData || []);

            const { data: relatedData } = await supabase.from('products').select('*').eq('category', productData?.category).neq('id', id).limit(4);
            setRelatedItems(relatedData || []);

            const { data: boughtData } = await supabase.from('products').select('*').eq('category', productData?.category).neq('id', id).limit(2);
            setFrequentlyBought(boughtData || []);
        }
        if (id) fetchProduct();
    }, [id]);

    if (!product) return <div>Loading...</div>;

    const breadcrumbs = [
        { name: 'Home', href: '/' },
        { name: 'Shop', href: '/shop' },
        { name: product.category.replace('-', ' ').toUpperCase(), href: `/category/${product.category}` },
        { name: product.name, href: `/product/${id}` },
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
            <div className="flex flex-col p-6 max-w-5xl mx-auto">
                <nav className="flex items-center space-x-2 text-gray-600 mb-6">
                    {breadcrumbs.map((crumb, i) => (
                        <div key={crumb.href} className="flex items-center">
                            <Link href={crumb.href} className="hover:text-purple-700">
                                {crumb.name}
                            </Link>
                            {i < breadcrumbs.length - 1 && <span className="mx-2">></span>}
                        </div>
                    ))}
                </nav>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/2">
                        <img src={mainImage} alt={product.name} className="w-full h-96 object-cover rounded-lg" />
                        <div className="flex gap-2 mt-4">
                            {product.images.map((image, i) => (
                                <img
                                    key={i}
                                    src={image}
                                    alt={`${product.name} ${i + 1}`}
                                    className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                                    onClick={() => setMainImage(image)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="w-full md:w-1/2 bg-white/90 rounded-lg p-6 shadow-md">
                        <h1 className="text-3xl font-bold text-purple-800 font-['Playfair_Display'] mb-4">{product.name}</h1>
                        <p className="text-xl text-gray-700 mb-4">${product.price.toFixed(2)}</p>
                        <p className="text-gray-600 mb-6">{product.description}</p>
                        <button className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-300">
                            Add to Cart
                        </button>
                    </div>
                </div>
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-purple-800 font-['Playfair_Display'] mb-4">Customer Reviews</h2>
                    <div className="bg-white/90 rounded-lg p-6 shadow-md">
                        {reviews.length === 0 ? (
                            <p className="text-gray-600">No reviews yet.</p>
                        ) : (
                            reviews.map((review) => (
                                <div key={review.id} className="mb-4">
                                    <div className="flex items-center mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <svg
                                                key={i}
                                                className={`w-5 h-5 ${i < review.rating ? 'text-yellow-600' : 'text-gray-300'}`}
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.39 2.46a1 1 0 00-.364 1.118l1.286 3.97c.3.921-.755 1.688-1.54 1.118l-3.39-2.46a1 1 0 00-1.175 0l-3.39 2.46c-.784.57-1.838-.197-1.54-1.118l1.286-3.97a1 1 0 00-.364-1.118l-3.39-2.46c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.97z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <p className="text-gray-600">{review.comment}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-purple-800 font-['Playfair_Display'] mb-4">Related Items</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {relatedItems.map((item) => (
                            <Link
                                key={item.id}
                                href={`/product/${item.id}`}
                                className="relative bg-white/80 rounded-lg shadow-md p-4 hover:scale-105 transition-all duration-300"
                            >
                                <img src={item.image} alt={item.name} className="w-full h-48 object-cover rounded-lg" />
                                <h3 className="text-xl font-semibold text-gray-800 mt-2">{item.name}</h3>
                                <p className="text-gray-600">${item.price.toFixed(2)}</p>
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-purple-800 font-['Playfair_Display'] mb-4">Frequently Bought Together</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {frequentlyBought.map((item) => (
                            <Link
                                key={item.id}
                                href={`/product/${item.id}`}
                                className="relative bg-white/80 rounded-lg shadow-md p-4 hover:scale-105 transition-all duration-300"
                            >
                                <img src={item.image} alt={item.name} className="w-full h-48 object-cover rounded-lg" />
                                <h3 className="text-xl font-semibold text-gray-800 mt-2">{item.name}</h3>
                                <p className="text-gray-600">${item.price.toFixed(2)}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}