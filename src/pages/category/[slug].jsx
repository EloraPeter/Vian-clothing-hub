import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Footer from '@/components/footer';
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import CartPanel from "@/components/CartPanel";
import Breadcrumbs from '@/components/Breadcrumbs';
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
    const [category, setCategory] = useState(null);


    useEffect(() => {
        if (!slug) return;

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

            // Fetch category
            const { data: categoryData } = await supabase
                .from('categories')
                .select('id, name, slug, parent_id')
                .eq('slug', slug)
                .single();
            setCategory(categoryData);

            // Fetch products
            let query = supabase
                .from('products')
                .select('id, name, image_url, price, is_on_sale, discount_percentage, is_out_of_stock')
                .eq('category_id', categoryData?.id);

            if (filters.size) query = query.eq('size', filters.size);
            if (filters.color) query = query.eq('color', filters.color);
            if (filters.price) {
                const [min, max] = filters.price.split('-').map(Number);
                query = query.gte('price', min).lte('price', max);
            }

            const { data: productsData } = await query;
            setProducts(productsData || []);
            setLoading(false);
        }
        fetchData();
    }, [slug, filters]);



    if (loading) return <DressLoader />;

    return (
        <>
        <Head>
        <title>{category?.name} - Vian Clothing Hub</title>
        <meta name="description" content={`Shop ${category?.name} at Vian Clothing Hub. Discover trendy African and contemporary fashion.`} />
      </Head>
<main className="min-h-screen bg-gray-100">            
            <Navbar
                profile={profile}
                onCartClick={() => setIsCartOpen(true)}
                cartItemCount={useCart().cart.length}
            />
            <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

            <div className="max-w-7xl mx-auto px-4 py-12">
          <Breadcrumbs category={category} />
          <h1 className="text-3xl font-bold text-purple-800 font-playfair-display mb-6">
            {category?.name}
          </h1>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <select
              value={filters.size}
              onChange={(e) => setFilters({ ...filters, size: e.target.value })}
              className="px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Sizes</option>
              <option value="S">Small</option>
              <option value="M">Medium</option>
              <option value="L">Large</option>
            </select>
            <select
              value={filters.color}
              onChange={(e) => setFilters({ ...filters, color: e.target.value })}
              className="px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Colors</option>
              <option value="Red">Red</option>
              <option value="Blue">Blue</option>
              <option value="Gold">Gold</option>
            </select>
            <select
              value={filters.price}
              onChange={(e) => setFilters({ ...filters, price: e.target.value })}
              className="px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Prices</option>
              <option value="0-5000">₦0 - ₦5,000</option>
              <option value="5000-10000">₦5,000 - ₦10,000</option>
              <option value="10000-20000">₦10,000 - ₦20,000</option>
            </select>
          </div>
          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`}>
                <a className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100">
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
                </a>
              </Link>
            ))}
          </div>
        </div>
            <Footer />
        </main>
        </>
    );
}