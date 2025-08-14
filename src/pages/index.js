import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar, FaShippingFast, FaUndo, FaLock, FaRulerCombined } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";
import CartPanel from "@/components/CartPanel";
import Head from "next/head";
// import Image from "next/legacy/image";
import Image from 'next/image';
import DressLoader from "@/components/DressLoader";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import FloatingChatButton from "@/components/FloatingChatButton";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const { addToCart, cart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [categories, setCategories] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Skeleton components
  const SkeletonCategory = () => (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100 animate-pulse">
      <div className="w-full h-32 sm:h-40 bg-gray-200 rounded-lg mb-4"></div>
      <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto"></div>
    </div>
  );

  const SkeletonProduct = () => (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md border border-gray-100 animate-pulse">
      <div className="w-full h-40 sm:h-48 bg-gray-200 rounded-lg mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </div>
  );

  // Fetch user profile and initial data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("email, avatar_url, is_admin")
            .eq("id", user.id)
            .maybeSingle();
          if (profileError) throw new Error(profileError.message);
          setProfile(profileData);
        }

        // Fetch categories with a sample product image
        const { data: categoriesData, error: catError } = await supabase
          .from("categories")
          .select("id, name, slug, parent_id, products(image_url)")
          .order("parent_id, name");
        if (catError) throw new Error(catError.message);
        setCategories(categoriesData || []);

        // Fetch initial new arrivals
        const { data: productsData, error: prodError } = await supabase
          .from("products")
          .select("id, name, image_url, price, is_on_sale, discount_percentage, is_out_of_stock")
          .eq("is_new", true)
          .range(0, 7);
        if (prodError) throw new Error(prodError.message);
        setNewArrivals(productsData || []);
        setHasMore(productsData && productsData.length === 8);

        // Fetch sale products
        const { data: saleData, error: saleError } = await supabase
          .from("products")
          .select("id, name, image_url, price, is_on_sale, discount_percentage, is_out_of_stock")
          .eq("is_on_sale", true)
          .limit(6);
        if (saleError) throw new Error(saleError.message);
        setSaleProducts(saleData || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch more products for infinite scroll
  useEffect(() => {
    if (page === 1) return;
    async function fetchMoreProducts() {
      setIsFetchingMore(true);
      try {
        const { data: productsData, error } = await supabase
          .from("products")
          .select("id, name, image_url, price, is_on_sale, discount_percentage, is_out_of_stock")
          .eq("is_new", true)
          .range((page - 1) * 8, page * 8 - 1);
        if (error) throw new Error(error.message);
        setNewArrivals((prev) => [...prev, ...(productsData || [])]);
        setHasMore(productsData && productsData.length === 8);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsFetchingMore(false);
      }
    }
    fetchMoreProducts();
  }, [page]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
        hasMore &&
        !isFetchingMore &&
        !loading
      ) {
        setPage((prev) => prev + 1);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, isFetchingMore, loading]);

  // Static carousel slides
  const carouselSlides = [
    {
      image: "/hero1.jpeg",
      title: "Discover New Arrivals",
      subtitle: "Trendy styles for every occasion",
      cta: "Shop Now",
      link: "/shop",
    },
    {
      image: "/hero2.png",
      title: "Flash Sale: Up to 50% Off",
      subtitle: "Grab your favorites before they're gone!",
      cta: "Shop Sale",
      link: "/shop?sale=true",
    },
    {
      image: "/hero3.png",
      title: "Custom Orders Tailored for You",
      subtitle: "Design your dream outfit today",
      cta: "Create Now",
      link: "/custom-order",
    },
  ];

  // Static testimonials
  const testimonials = [
    {
      name: "Chidinma O.",
      quote: "Vian&lsquo;s dresses are stunning and affordable! Fast delivery to Lagos.",
      rating: 5,
    },
    {
      name: "Ahmed T.",
      quote: "The custom tailoring was perfect for my event. Highly recommend!",
      rating: 4.5,
    },
    {
      name: "Funmi A.",
      quote: "Love the quality and variety. My go-to for Nigerian fashion!",
      rating: 5,
    },
  ];

  const galleryImages = [
    {
      src: "/about1.jpg",
      alt: "Model in Vian Ankara gown",
    },
    {
      src: "/about2.jpg",
      alt: "Tailor crafting custom outfit",
    },
    {
      src: "/about3.jpg",
      alt: "Vian streetwear collection",
    },
  ];

  if (loading) return <DressLoader />;
  if (error) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-red-600 text-lg">Error: {error}</p>
    </div>
  );

  const homeSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Vian Clothing Hub",
    "url": "https://vianclothinghub.com.ng/",
    "description": "Shop Ready-to-Wear Fashion - Vian Clothing Hub Nigeria. Discover trendy dresses, tops, and accessories with nationwide delivery.",
    "publisher": {
      "@type": "Organization",
      "name": "Vian Clothing Hub",
      "logo": {
        "@type": "ImageObject",
        "url": "https://vianclothinghub.com.ng/logo.svg"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+234-123-456-7890", // Add real phone
        "contactType": "Customer Service"
      }
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://vianclothinghub.com.ng/"
        }
      ]
    },
    "hasPart": [
      {
        "@type": "ItemList",
        "name": "New Arrivals",
        "itemListElement": newArrivals.slice(0, 5).map((product, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": product.name,
            "image": product.image_url,
            "url": `https://vianclothinghub.com.ng/product/${product.id}`,
            "offers": {
              "@type": "Offer",
              "price": product.price,
              "priceCurrency": "NGN",
              "availability": product.is_out_of_stock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
            }
          }
        }))
      },
      {
        "@type": "ItemList",
        "name": "Testimonials",
        "itemListElement": testimonials.map((testimonial, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Review",
            "reviewBody": testimonial.quote,
            "author": testimonial.name,
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": testimonial.rating
            }
          }
        }))
      }
    ]
  };

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
        <meta name="robots" content="index, follow" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema) }}
        />
      </Head>

      <main className="min-h-screen bg-gray-100 relative">
        <Navbar
          profile={profile}
          onCartClick={() => setIsCartOpen(true)}
          cartItemCount={cart.length}
        />
        <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

        <div className="container mx-auto mt-0 px-4 sm:px-6 lg:px-0 py-4">
          {/* Hero Carousel */}
          <section className="relative mb-12 mt-0">
            <Carousel
              showThumbs={false}
              autoPlay
              infiniteLoop
              interval={5000}
              showStatus={false}
              showArrows={true}
              className="rounded-xl overflow-hidden"
            >
              {carouselSlides.map((slide, index) => (
                <div key={index} className="relative h-[500px] sm:h-[400px] md:h-[600px]">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-4">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-playfair-display mb-2">
                      {slide.title}
                    </h1>
                    <p className="text-sm sm:text-base text-white mb-4">{slide.subtitle}</p>
                    <Link
                      href={slide.link}
                      className="bg-purple-500 text-purple-100 font-semibold px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                      role="button"
                      aria-label={slide.cta}
                    >
                      {slide.cta}
                    </Link>
                  </div>
                </div>
              ))}
            </Carousel>
          </section>

          {/* Why Shop With Us */}
          <section className="max-w-7xl mx-auto bg-white rounded-xl shadow-md p-6 sm:p-8 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-6">
              Why Shop With Vian?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <FaShippingFast className="text-4xl text-purple-700 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Nationwide Delivery</h3>
                <p className="text-sm text-gray-600">Fast shipping to Lagos, Abuja, and beyond.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <FaUndo className="text-4xl text-purple-700 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Easy Returns</h3>
                <p className="text-sm text-gray-600">Hassle-free returns within 7 days.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <FaLock className="text-4xl text-purple-700 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Secure Payments</h3>
                <p className="text-sm text-gray-600">Pay safely with card, transfer, or COD.</p>
              </div>
            </div>
          </section>

          {/* Flash Sale Section */}
          {saleProducts.length > 0 && (
            <section className="mb-12">
              <h2 className="max-w-7xl mx-auto text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-6">
                Flash Sale - Limited Time!
              </h2>
              <div className="grid grid-cols-1 mx-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
                {saleProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white p-4 sm:p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 relative group"
                  >
                    <Link href={`/product/${product.id}`} role="button" aria-label={`View ${product.name} product details`}>
                      <div className="relative w-full h-40 sm:h-48 mb-4">
                        <Image
                          src={product.image_url}
                          alt={`Image of ${product.name}`}
                          layout="fill"
                          objectFit="cover"
                          className="rounded-lg"
                          loading="lazy"
                        />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
                      <p className="text-purple-700 font-semibold text-sm sm:text-base">
                        <span className="line-through text-red-600">₦{Number(product.price).toLocaleString()}</span>
                        <span className="ml-2 text-green-600">
                          ₦{(product.price * (1 - product.discount_percentage / 100)).toLocaleString()}
                        </span>
                      </p>
                    </Link>
                    <div className="flex items-center mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar key={star} className="text-yellow-400 text-sm" />
                      ))}
                    </div>
                    {product.is_out_of_stock ? (
                      <span className="text-red-600 text-xs sm:text-sm absolute top-2 right-2 bg-red-100 px-2 py-1 rounded">
                        Out of Stock
                      </span>
                    ) : (
                      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => addToCart({ ...product, quantity: 1 })}
                          className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700"
                          aria-label={`Add ${product.name} to cart`}
                        >
                          <FaShoppingCart />
                        </button>
                        <button
                          onClick={() => toggleWishlist(product.id)}
                          className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700"
                          aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                        >
                          {isInWishlist(product.id) ? <FaHeart /> : <FaRegHeart />}
                        </button>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">Sale</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Category Tiles */}
          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-8">
              Shop by Category
            </h2>
            <div className="grid grid-cols-1 mx-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {loading
                ? Array(4)
                  .fill()
                  .map((_, index) => <SkeletonCategory key={index} />)
                : categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/category/${category?.slug}`}
                    className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-purple-200 relative group"
                    role="button"
                    aria-label={`Shop ${category.name} category`}
                  >
                    <div className="relative w-full h-32 sm:h-40 mb-4">
                      <Image
                        src={category.products?.[0]?.image_url || "/placeholder.jpg"}
                        alt={`${category.name} category`}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="text-lg sm:text-xl font-semibold text-white">{category.name}</h3>
                    </div>
                  </Link>
                ))}
            </div>
          </section>

          {/* New Arrivals */}
          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-8">
              New Arrivals
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
              {newArrivals.map((product) => (
                <div
                  key={product.id}
                  className="bg-white p-4 sm:p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 relative group"
                >
                  <Link href={`/product/${product.id}`} role="button" aria-label={`View ${product.name} product details`}>
                    <div className="relative w-full h-40 sm:h-48 mb-4">
                      <Image
                        src={product.image_url}
                        alt={`Image of ${product.name}`}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                        loading="lazy"
                      />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
                    <p className="text-purple-700 font-semibold text-sm sm:text-base">
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
                  </Link>
                  <div className="flex items-center mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar key={star} className="text-yellow-400 text-sm" />
                    ))}
                  </div>
                  {product.is_out_of_stock ? (
                    <span className="text-red-600 text-xs sm:text-sm absolute top-2 right-2 bg-red-100 px-2 py-1 rounded">
                      Out of Stock
                    </span>
                  ) : (
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => addToCart({ ...product, quantity: 1 })}
                        className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700"
                        aria-label={`Add ${product.name} to cart`}
                      >
                        <FaShoppingCart />
                      </button>
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700"
                        aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                      >
                        {isInWishlist(product.id) ? <FaHeart /> : <FaRegHeart />}
                      </button>
                    </div>
                  )}
                  {product.is_new && (
                    <span className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">New</span>
                  )}
                </div>
              ))}
            </div>
            {isFetchingMore && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mt-6">
                {Array(4)
                  .fill()
                  .map((_, index) => (
                    <SkeletonProduct key={index} />
                  ))}
              </div>
            )}
          </section>

          {/* Testimonials */}
          <section className="max-w-7xl mx-auto p-6 sm:p-8 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-purple-800 font-playfair-display text-center mb-8">
              What Our Customers Say
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star}>
                        {star <= Math.floor(testimonial.rating) ? (
                          <FaStar className="text-yellow-400 text-sm" />
                        ) : star === Math.ceil(testimonial.rating) && testimonial.rating % 1 !== 0 ? (
                          <FaStarHalfAlt className="text-yellow-400 text-sm" />
                        ) : (
                          <FaRegStar className="text-yellow-400 text-sm" />
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 italic">&quot;{testimonial.quote}&quot;</p>
                  <p className="text-sm font-semibold text-gray-900 mt-2">{testimonial.name}</p>
                </div>
              ))}
            </div>
          </section>

          {/* about */}
          <section className="bg-gray-200 px-4 py-10 sm:px-8 lg:px-16 rounded-xl mb-20 max-w-7xl mx-auto">
            {/* Top Section */}
            <div className="flex flex-col lg:flex-row items-center lg:gap-12">
              {/* Left */}
              <div className="lg:w-1/2 text-center lg:text-left space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold text-purple-800 font-playfair-display">
                  About Vian Clothing Hub
                </h2>
                <p className="text-base sm:text-lg text-gray-600">
                  Discover Nigerian fashion with Vian Clothing Hub’s curated African prints, including Ankara dresses and Adire streetwear, delivered to Lagos, Abuja, and beyond.
                </p>
                <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto lg:mx-0">
                  <span className="text-purple-700 font-semibold">Vian Clothing Hub</span> is Nigeria’s premier online fashion destination, blending vibrant African prints with modern elegance for every occasion.
                </p>
                <div className="flex justify-center lg:justify-start">
                  <Link
                    href="/shop"
                    className="bg-gold-500 text-purple-800 font-semibold px-6 py-3 rounded-lg hover:bg-gold-600 hover:scale-105 transition-transform duration-200"
                    role="button"
                    aria-label="Start shopping at Vian Clothing Hub"
                  >
                    Discover Our Style
                  </Link>
                </div>
              </div>

              {/* Right: Carousel */}
              <div className="lg:w-1/2 mt-10 lg:mt-0 max-w-xl mx-auto rounded-lg overflow-hidden shadow-md">
                <Carousel
                  showThumbs={false}
                  autoPlay
                  infiniteLoop
                  interval={4000}
                  showStatus={false}
                  showArrows={true}
                >
                  {galleryImages.map((image, index) => (
                    <div key={index} className="relative h-56 sm:h-72 lg:h-80">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </Carousel>
              </div>
            </div>

            {/* Features Grid */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              <div className="flex items-start gap-4">
                <FaShoppingCart className="text-3xl text-purple-700 mt-1 hover:scale-110 transition-transform duration-200" />
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Curated Collections</h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Shop women’s gowns, men’s traditional attire, unisex streetwear, and African prints like Ankara and Adire.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <FaRulerCombined className="text-3xl text-purple-700 mt-1 hover:scale-110 transition-transform duration-200" />
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Bespoke Tailoring</h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Create custom outfits with our expert tailors, crafted to your measurements and style.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <FaShippingFast className="text-3xl text-purple-700 mt-1 hover:scale-110 transition-transform duration-200" />
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Nationwide Delivery</h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Fast, reliable shipping across Nigeria with flexible payments and easy returns.
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gold-500 w-24 mx-auto my-16" />

            {/* Unique Selling Points */}
            <div className="text-center max-w-md mx-auto space-y-4">
              <h3 className="text-xl font-semibold text-purple-700">Why Choose Vian?</h3>
              <ul className="list-disc list-inside text-gray-600 text-base space-y-2 text-left">
                <li>Authentic, high-quality fashion</li>
                <li>Nationwide delivery to Lagos, Abuja, and beyond</li>
                <li>Secure payments and 7-day returns</li>
                <li>Exclusive sales and discounts</li>
              </ul>
            </div>

            {/* Bottom CTAs */}
            <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6">
              <Link
                href="/shop"
                className="bg-gold-500 text-purple-800 font-semibold px-6 py-3 rounded-lg hover:bg-gold-600 hover:scale-105 transition-transform duration-200 text-center"
                role="button"
                aria-label="Start shopping at Vian Clothing Hub"
              >
                Shop Now
              </Link>
              <Link
                href="/about"
                className="border-2 border-purple-700 text-purple-700 font-semibold px-6 py-3 rounded-lg hover:bg-purple-700 hover:text-white transition-colors duration-200 text-center"
                role="button"
                aria-label="Learn more about Vian Clothing Hub"
              >
                Learn More
              </Link>
            </div>
          </section>



          {/* Sticky CTA */}

          <button
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-25 right-4 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-colors z-50"
            aria-label="Open cart"
          >
            <FaShoppingCart className="text-xl" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
            <div className="absolute -inset-4 bg-purple-200 bg-opacity-20 rounded-full animate-ping" />

          </button>
          <FloatingChatButton cartItemCount={0} /> {/* Replace 0 with actual cart count if available */}
        </div>

        <Footer />
      </main>
    </>
  );
}