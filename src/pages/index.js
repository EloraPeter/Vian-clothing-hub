import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext"; // we'll build this
import { useWishlist } from "@/context/WishlistContext"; // also build this
import { FaHeart, FaRegHeart, FaShoppingCart } from "react-icons/fa";
import Navbar from "@/components/Navbar";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null); // 👈 Add profile state


  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  // 👇 Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileError) {
          setProfile(profileData);
        } else {
          console.error('Profile fetch error:', profileError.message);
        }
      } else if (userError) {
        console.error('User fetch error:', userError.message);
      }
    }

    fetchProfile();
  }, []);

  // 👇 Fetch products
  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase.from('products').select('*');
      if (error) console.error('Error fetching products:', error.message);
      else setProducts(data);
    }

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <Navbar profile={profile} />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center mb-12 text-purple-700">
          Ready-to-Wear Collection
          <span className="block mt-2 h-1 w-20 bg-purple-500 mx-auto"></span>
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 hover:border-purple-100 relative group"
            >
              <button
                onClick={() => toggleWishlist(product)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 rounded-full backdrop-blur-sm hover:bg-red-50 transition-colors"
                aria-label={
                  isInWishlist(product.id)
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
              >
                {isInWishlist(product.id) ? (
                  <FaHeart className="text-red-500 w-5 h-5" />
                ) : (
                  <FaRegHeart className="text-gray-400 group-hover:text-red-400 w-5 h-5 transition-colors" />
                )}
              </button>

              <div className="relative overflow-hidden rounded-lg aspect-square mb-5">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-bold text-gray-900 line-clamp-1">
                  {product.name}
                </h2>
                <p className="text-gray-500 text-sm line-clamp-2 min-h-[40px]">
                  {product.description}
                </p>
                <p className="text-lg font-bold text-purple-700 mt-1">
                  ₦{Number(product.price).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => addToCart(product)}
                className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 font-medium"
              >
                <FaShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
