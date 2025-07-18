import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Footer from '@/components/Footer';



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
      <section className="bg-gray-900 p-6 rounded-lg mb-8 text-center">
        <h1 className="text-3xl font-bold text-gold-300 mb-4">Vian Clothing Hub – Nigeria’s Ultimate Fashion Destination</h1>
        <p className="text-lg text-gray-300 mb-4">Discover the Best of African & Contemporary Fashion Online</p>
        <p className="text-md text-gray-400 mb-4">
          Welcome to Vian Clothing Hub, your No.1 online fashion store in Nigeria. From trendy ready-to-wear styles to elegant custom pieces, Vian Clothing Hub offers you the convenience of shopping premium-quality fashion items from the comfort of your home, workplace, or even on-the-go.
        </p>
        <p className="text-md text-gray-400 mb-4">
          Our platform was built for modern Nigerians who want stylish, affordable, and expressive fashion—delivered fast and stress-free. Whether you're in Lagos, Asaba, Abuja, or anywhere in Nigeria, Vian Clothing Hub delivers style to your doorstep.
        </p>
        <p className="text-lg font-semibold text-gold-300 mb-2">🔥 Trendy, Original, and Affordable</p>
        <p className="text-md text-gray-400 mb-4">
          We take pride in offering authentic and stylish fashion that reflects your personality. Whether you're going to a wedding, brunch, work, church, or simply dressing up for yourself, Vian Clothing Hub has the perfect outfit.
        </p>
        <p className="text-md text-gray-400 mb-4">
          Shop from our wide collection of:
         </p>
          <ul className="list-disc list-inside mt-2">
            <li>Women’s Ready-to-Wear Gowns, Two-Pieces & Casuals</li>
            <li>Men’s Traditional & Smart Casual Looks</li>
            <li>Unisex Streetwear, Jackets, Tees, and Joggers</li>
            <li>Matching Couple Styles</li>
            <li>African-Inspired Prints (Ankara, Adire, Aso Oke)</li>
          </ul>
          Plus, we stock accessories like handbags, jewelry, headwraps, bonnets, scarves, and more — all made to match your outfits perfectly.
        
        <p className="text-lg font-semibold text-gold-300 mb-2">✨ What Makes Vian Clothing Hub Special?</p>
        <ul className="list-disc list-inside text-gray-400 mb-4">
          <li>🎯 Authenticity Guaranteed: Every piece is made or sourced with quality in mind.</li>
          <li>🚚 Nationwide Delivery: From Lagos to Asaba to Kano — we ship everywhere!</li>
          <li>💳 Flexible Payments: Pay on delivery or online with your card, transfer, or USSD.</li>
          <li>♻️ Easy Returns: Not satisfied? Return it within 7 days. No stress, no wahala.</li>
          <li>🔥 Flash Sales & Discounts: Enjoy up to 50% off during our Style Weeks.</li>
          <li>🌍 Made in Nigeria, Loved Everywhere.</li>
        </ul>
        <p className="text-lg font-semibold text-gold-300 mb-2">🧵 Custom Orders & Bespoke Tailoring</p>
        <p className="text-md text-gray-400 mb-4">
          Looking for something made just for you? At Vian Clothing Hub, you can place custom orders for events, bridal parties, corporate uniforms, and more. Our talented in-house tailors and fashion designers are ready to bring your dream outfit to life.
        </p>
        <p className="text-md text-gray-400 mb-4">
          Just send us your measurements and preferred style via WhatsApp or our style form, and we’ll do the magic.
        </p>
        <p className="text-lg font-semibold text-gold-300 mb-2">💄 Beauty, Lifestyle & More</p>
        <p className="text-md text-gray-400 mb-4">
          Complete your look with our Vian Beauty and Lifestyle Collection — featuring skincare, wigs, bonnets, beauty sets, and home fragrances to keep you glowing from head to toe.
        </p>
        <p className="text-md text-gray-400 mb-4">
          📱 Shop On the Go
          Visit our website anytime, or shop directly via our WhatsApp store. Follow us on social media @vianclothinghub to see new arrivals, style inspiration, and exclusive offers.
        </p>
        <p className="text-lg font-semibold text-gold-300 mb-2">🧾 Frequently Asked Questions (FAQs)</p>
        <ul className="list-disc list-inside text-gray-400 mb-4">
          <li>Can I return items I bought from Vian Clothing Hub? Yes! You have up to 7 days to return eligible items. T&Cs apply.</li>
          <li>Where do you deliver to? We deliver across Nigeria using trusted logistics partners. Express delivery available in select cities.</li>
          <li>How can I pay? We accept payment on delivery (in select cities), debit/credit cards, bank transfer, and USSD.</li>
          <li>Can I order custom outfits? Absolutely. Custom/bespoke orders are available. Chat with our style consultant to begin.</li>
          <li>Do you offer group/corporate discounts? Yes! Whether it’s for weddings, events, or team wear — we offer discounts on bulk orders.</li>
        </ul>
      </section>

      <Footer />

    </div>
  );
}