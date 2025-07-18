import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import Navbar from "@/components/Navbar";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(30);
  const [sortOption, setSortOption] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (!profileError) setProfile(profileData);
        else console.error("Profile fetch error:", profileError.message);
      } else if (userError) console.error("User fetch error:", userError.message);
    }
    fetchProfile();
  }, []);

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const { data, error } = await supabase.from("products").select("*");
      if (error) console.error("Error fetching products:", error.message);
      else setProducts(data);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  // Filter and sort products
  const displayedProducts = useMemo(() => {
    let result = [...products];
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (sortOption === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    }
    return result;
  }, [products, selectedCategory, sortOption]);

  // Pagination
  const totalPages = Math.ceil(displayedProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = displayedProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // Reset page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
  }, [totalPages, currentPage]);

  // Render dynamic rating stars
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<FaStar key={i} className="w-4 h-4 text-yellow-400" />);
      } else if (i - 0.5 <= rating) {
        stars.push(<FaStarHalfAlt key={i} className="w-4 h-4 text-yellow-400" />);
      } else {
        stars.push(<FaRegStar key={i} className="w-4 h-4 text-yellow-400" />);
      }
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <Navbar profile={profile} />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-center mb-12 text-purple-700">
          Ready-to-Wear Collection
          <span className="block mt-2 h-1 w-20 bg-purple-500 mx-auto"></span>
        </h1>

        {/* Filter/Sort Bar */}
        <div className="mb-6 flex flex-wrap gap-4">
          <select
            value={`setsortOption`}
            onChange={(e) => setSortOption(e.target.value)}
            className="text-gray-600 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Sort products"
          >
            <option value="">Sort by: Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-gray-600 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Filter by category"
          >
            <option value="">Filter by Category</option>
            <option value="dresses">Dresses</option>
            <option value="tops">Tops</option>
            {/* Add more categories based on your data */}
          </select>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {loading ? (
            Array(8).fill().map((_, i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-xl shadow-md animate-pulse border border-gray-100"
              >
                <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              </div>
            ))
          ) : currentProducts.length > 0 ? (
            currentProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-purple-200 relative group overflow-hidden"
                role="article"
                aria-label={product.name}
              >
                {product.isOnSale && (
                  <span className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    Sale
                  </span>
                )}
                <button
                  onClick={() => toggleWishlist(product)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full backdrop-blur-sm hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  {isInWishlist(product.id) ? (
                    <FaHeart className="text-red-500 w-5 h-5" />
                  ) : (
                    <FaRegHeart className="text-gray-400 group-hover:text-red-400 w-5 h-5 transition-colors" />
                  )}
                </button>
                <a href={`/product/${product.id}`} className="block">
                  <div className="relative overflow-hidden rounded-xl aspect-square mb-4">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                      <span className="text-white text-sm font-medium">{product.category}</span>
                    </div>
                  </div>
                </a>
                <div className="space-y-3">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 line-clamp-1">
                    {product.name}
                  </h2>
                  <div className="flex gap-0.5">{renderStars(product.rating || 0)}</div>
                  <p className="text-gray-600 text-sm md:text-base line-clamp-2 min-h-[48px]">
                    {product.description}
                  </p>
                  <p className="text-xl font-semibold text-purple-700 mt-2">
                    ₦{Number(product.price).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 font-medium"
                  aria-label={`Add ${product.name} to cart`}
                >
                  <FaShoppingCart className="w-4 h-4" />
                  <span>Add to Cart</span>
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 col-span-full">No products available.</p>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex justify-center gap-2 items-center">
          <button
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            Previous
          </button>
          <span aria-live="polite">Page {currentPage} of {totalPages}</span>
          <button
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}