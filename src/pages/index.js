import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import {
  FaHeart,
  FaRegHeart,
  FaShoppingCart,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
} from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";
import CartPanel from "@/components/CartPanel";
import Head from "next/head";
import DressLoader from "@/components/DressLoader";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const { addToCart, cart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [categories, setCategories] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [featuredCollections, setFeaturedCollections] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);

  // Fetch user profile, categories, new arrivals, featured collections, and reviews
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Fetch user profile
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(profileData);
      }

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .order("parent_id, name");
      setCategories(categoriesData || []);

      // Fetch new arrivals
      const { data: productsData } = await supabase
        .from("products")
        .select(
          "id, name, image_url, price, is_on_sale, discount_percentage, is_out_of_stock"
        )
        .eq("is_new", true)
        .limit(8);
      setNewArrivals(productsData || []);

      // Fetch featured collections (mock data for new section)
      const { data: featuredData } = await supabase
        .from("products")
        .select("id, name, image_url, price")
        .eq("is_featured", true)
        .limit(4);
      setFeaturedCollections(featuredData || []);

      // Fetch customer reviews (mock data for new section)
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("id, customer_name, rating, comment, created_at")
        .limit(3);
      setCustomerReviews(reviewsData || []);

      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <DressLoader />;

  return (
    <>
      <Head>
        <title>Shop Ready-to-Wear Fashion - Vian Clothing Hub Nigeria</title>
        <meta
          name="description"
          content="Browse Vian Clothing Hub's exclusive Ready-to-Wear collection. Discover trendy dresses, tops, and accessories with nationwide delivery across Nigeria."
        />
        <meta
          name="keywords"
          content="Ready-to-Wear, Nigerian Fashion, Dresses, Tops, Accessories, Vian Clothing Hub"
        />
        <meta name="author" content="Vian Clothing Hub" />
        <meta
          property="og:title"
          content="Shop Ready-to-Wear Fashion - Vian Clothing Hub Nigeria"
        />
        <meta
          property="og:description"
          content="Explore our latest collection of stylish ready-to-wear fashion with fast delivery across Nigeria."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <main className="min-h-screen bg-gray-100 relative">
        <Navbar
          profile={profile}
          onCartClick={() => setIsCartOpen(true)}
          cartItemCount={cart.length}
        />
        <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Hero Banner */}
          <section className="relative text-center py-12 sm:py-20 mb-8 sm:mb-12 bg-gradient-to-r from-purple-100 to-gold-100 rounded-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-800 font-playfair-display">
              Welcome to Vian Clothing Hub
            </h1>
            <p className="text-base sm:text-lg text-black mt-4 px-4">
              Discover Nigeria’s Finest Fashion – Trendy, Authentic, Affordable
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block bg-gold-500 text-purple-800 font-semibold px-6 sm:px-8 py-3 rounded-lg hover:bg-gold-600 transition-colors"
            >
              Shop Now
            </Link>
          </section>

          {/* Category Tiles */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-6 sm:mb-8">
              Shop by Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category?.slug}`}
                  className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-purple-200 text-center"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-purple-700">
                    {category.name}
                  </h3>
                </Link>
              ))}
            </div>
          </section>

          {/* New Arrivals */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-6 sm:mb-8">
              New Arrivals
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {newArrivals.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="bg-white p-4 sm:p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 flex flex-col"
                >
                  <div className="relative">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-40 sm:h-48 object-cover rounded-lg mb-4"
                    />
                    <button
                      onClick={() => toggleWishlist(product)}
                      className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full backdrop-blur-sm hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {product.name}
                  </h3>
                  <p className="text-purple-700 font-semibold text-sm sm:text-base">
                    {product.is_on_sale ? (
                      <>
                        <span className="line-through text-red-600">
                          ₦{Number(product.price).toLocaleString()}
                        </span>
                        <span className="ml-2 text-green-600">
                          ₦
                          {(
                            product.price *
                            (1 - product.discount_percentage / 100)
                          ).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      `₦${Number(product.price).toLocaleString()}`
                    )}
                  </p>
                  {product.is_out_of_stock && (
                    <span className="text-red-600 text-sm mt-2">
                      Out of Stock
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart(product);
                    }}
                    className="mt-2 bg-purple-700 text-white px-4 py-2 rounded-lg hover:bg-purple-800 transition-colors text-sm sm:text-base"
                    disabled={product.is_out_of_stock}
                  >
                    Add to Cart
                  </button>
                </Link>
              ))}
            </div>
          </section>

          {/* Featured Collections */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-6 sm:mb-8">
              Featured Collections
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {featuredCollections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/product/${collection.id}`}
                  className="bg-white p-4 sm:p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100"
                >
                  <img
                    src={collection.image_url}
                    alt={collection.name}
                    className="w-full h-40 sm:h-48 object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {collection.name}
                  </h3>
                  <p className="text-purple-700 font-semibold text-sm sm:text-base">
                    ₦{Number(collection.price).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Customer Reviews */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-6 sm:mb-8">
              What Our Customers Say
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {customerReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100"
                >
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>
                        {i < Math.floor(review.rating) ? (
                          <FaStar className="text-yellow-500" />
                        ) : i < review.rating ? (
                          <FaStarHalfAlt className="text-yellow-500" />
                        ) : (
                          <FaRegStar className="text-yellow-500" />
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm sm:text-base mb-4">
                    {review.comment}
                  </p>
                  <p className="text-purple-700 font-semibold text-sm sm:text-base">
                    {review.customer_name}
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Style Inspiration */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-6 sm:mb-8">
              Style Inspiration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  id: 1,
                  image: "/inspiration1.jpg",
                  title: "Bold African Prints",
                  description: "Make a statement with vibrant Ankara styles.",
                },
                {
                  id: 2,
                  image: "/inspiration2.jpg",
                  title: "Elegant Evening Wear",
                  description: "Perfect gowns for your next event.",
                },
                {
                  id: 3,
                  image: "/inspiration3.jpg",
                  title: "Casual Chic",
                  description: "Effortless style for everyday wear.",
                },
              ].map((inspiration) => (
                <div
                  key={inspiration.id}
                  className="relative bg-white p-4 sm:p-5 rounded-xl shadow-md border border-gray-100"
                >
                  <img
                    src={inspiration.image}
                    alt={inspiration.title}
                    className="w-full h-40 sm:h-48 object-cover rounded-lg mb-4"
                  />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {inspiration.title}
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {inspiration.description}
                  </p>
                  <Link
                    href="/shop"
                    className="mt-4 inline-block text-purple-700 font-semibold hover:underline text-sm sm:text-base"
                  >
                    Shop This Look
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* About Vian Clothing Hub */}
          <section className="bg-gray-100 p-6 sm:p-8 mb-8 sm:mb-12 rounded-xl">
            <h1 className="text-2xl sm:text-3xl font-bold text-purple-700 font-playfair-display mb-4">
              Vian Clothing Hub – Nigeria’s Ultimate Fashion Destination
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mb-4">
              Discover the Best of African & Contemporary Fashion Online
            </p>
            <p className="text-sm sm:text-md text-gray-600 mb-4">
              Welcome to Vian Clothing Hub, your No.1 online fashion store in
              Nigeria. From trendy ready-to-wear styles to elegant custom
              pieces, Vian Clothing Hub offers you the convenience of shopping
              premium-quality fashion items from the comfort of your home,
              workplace, or even on-the-go.
            </p>
            <p className="text-sm sm:text-md text-gray-600 mb-4">
              Our platform was built for modern Nigerians who want stylish,
              affordable, and expressive fashion—delivered fast and stress-free.
              Whether you’re in Lagos, Asaba, Abuja, or anywhere in Nigeria,
              Vian Clothing Hub delivers style to your doorstep.
            </p>
            <p className="text-base sm:text-lg font-semibold text-purple-700 mb-2">
              🔥 Trendy, Original, and Affordable
            </p>
            <p className="text-sm sm:text-md text-gray-600 mb-4">
              We take pride in offering authentic and stylish fashion that
              reflects your personality. Whether you’re going to a wedding,
              brunch, work, church, or simply dressing up for yourself, Vian
              Clothing Hub has the perfect outfit.
            </p>
            <p className="text-sm sm:text-md text-gray-600 mb-4">
              Shop from our wide collection of:
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-600 text-sm sm:text-md">
              <li>Women’s Ready-to-Wear Gowns, Two-Pieces & Casuals</li>
              <li>Men’s Traditional & Smart Casual Looks</li>
              <li>Unisex Streetwear, Jackets, Tees, and Joggers</li>
              <li>Matching Couple Styles</li>
              <li>African-Inspired Prints (Ankara, Adire, Aso Oke)</li>
            </ul>
            <p className="text-sm sm:text-md text-gray-600 mb-4">
              Plus, we stock accessories like handbags, jewelry, headwraps,
              bonnets, scarves, and more — all made to match your outfits
              perfectly.
            </p>
            <p className="text-base sm:text-lg font-semibold text-purple-700 mb-2">
              ✨ What Makes Vian Clothing Hub Special?
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 text-sm sm:text-md">
              <li>
                🎯 Authenticity Guaranteed: Every piece is made or sourced with
                quality in mind.
              </li>
              <li>
                🚚 Nationwide Delivery: From Lagos to Asaba to Kano — we ship
                everywhere!
              </li>
              <li>
                💳 Flexible Payments: Pay on delivery or online with your card,
                transfer, or USSD.
              </li>
              <li>
                ♻️ Easy Returns: Not satisfied? Return it within 7 days. No
                stress, no wahala.
              </li>
              <li>
                🔥 Flash Sales & Discounts: Enjoy up to 50% off during our Style
                Weeks.
              </li>
              <li>🌍 Made in Nigeria, Loved Everywhere.</li>
            </ul>
            <p className="text-base sm:text-lg font-semibold text-purple-700 mb-2">
              🧵 Custom Orders & Bespoke Tailoring
            </p>
            <p className="text-sm sm:text-md text-gray-600 mb-4">
              Looking for something made just for you? At Vian Clothing Hub, you
              can place custom orders for events, bridal parties, corporate
              uniforms, and more. Our talented in-house tailors and fashion
              designers are ready to bring your dream outfit to life.
            </p>
            <p className="text-sm sm:text-md text-gray-600 mb-4">
              Just send us your measurements and preferred style via WhatsApp or
              our style form, and we’ll do the magic.
            </p>
            <p className="text-base sm:text-lg font-semibold text-purple-700 mb-2">
              💄 Beauty, Lifestyle & More
            </p>
            <p className="text-sm sm:text-md text-gray-600 mb-4">
              Complete your look with our Vian Beauty and Lifestyle Collection —
              featuring skincare, wigs, bonnets, beauty sets, and home
              fragrances to keep you glowing from head to toe.
            </p>
            <p className="text-sm sm:text-md text-gray-600 mb-4">
              📱 Shop On the Go Visit our website anytime, or shop directly via
              our WhatsApp store. Follow us on social media @vianclothinghub to
              see new arrivals, style inspiration, and exclusive offers.
            </p>
          </section>
        </div>

        <Footer />
      </main>
    </>
  );
}
