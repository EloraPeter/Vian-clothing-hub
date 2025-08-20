import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
    FaSearch,
    FaTh,
    FaList,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import debounce from "lodash.debounce";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";
import CartPanel from "@/components/CartPanel";
import DressLoader from "@/components/DressLoader";
import { Helmet } from "react-helmet";
import FloatingChatButton from "@/components/FloatingChatButton";

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage] = useState(30);
    const [sortOption, setSortOption] = useState("");
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [viewMode, setViewMode] = useState("grid");
    const [priceRange, setPriceRange] = useState([0, 30000]);
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState(30000);
    const [ratingFilter, setRatingFilter] = useState("");
    const [inStockOnly, setInStockOnly] = useState(false);
    const { addToCart, cart } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const { toggleWishlist, isInWishlist } = useWishlist();
    const [totalProducts, setTotalProducts] = useState(0);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [variants, setVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const modalRef = useRef(null);
    const searchInputRef = useRef(null);

    // Countdown timer for promotional banner
    const [promotions, setPromotions] = useState([]);
    const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState({});

    useEffect(() => {
        async function fetchPromotions() {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("promotions")
                .select("*, promotion_categories(category_id)")
                .eq("active", true)
                .lte("start_date", now)
                .gte("end_date", now)
                .order("created_at", { ascending: false });
            if (error) {
                console.error("Error fetching promotions:", error.message);
                toast.error("Failed to load promotions.");
            } else {
                setPromotions(data);
                // Initialize timeLeft for each promotion
                const initialTimeLeft = {};
                data.forEach((promo) => {
                    initialTimeLeft[promo.id] = calculateTimeLeft(promo.end_date);
                });
                setTimeLeft(initialTimeLeft);
            }
        }
        fetchPromotions();
    }, []);

    // Calculate time left for a given end date
    const calculateTimeLeft = (endDate) => {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;
        if (diff <= 0) return "Sale Ended";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    // Update countdown timers
    useEffect(() => {
        if (promotions.length === 0) return;
        const interval = setInterval(() => {
            const updatedTimeLeft = {...timeLeft};
            promotions.forEach((promo) => {
                const time = calculateTimeLeft(promo.end_date);
                updatedTimeLeft[promo.id] = time;
            });
            setTimeLeft(updatedTimeLeft);
            const activePromotions = promotions.filter((promo) => updatedTimeLeft[promo.id] !== "Sale Ended");
            setPromotions(activePromotions);
        }, 1000);
        return () => clearInterval(interval);
    }, [promotions, timeLeft]);

    // Auto-slide for promotions
    useEffect(() => {
        if (promotions.length <= 1) return;
        const slideInterval = setInterval(() => {
            setCurrentPromoIndex((prev) => (prev + 1) % promotions.length);
        }, 5000); // Change slide every 5 seconds
        return () => clearInterval(slideInterval);
    }, [promotions.length]);

    // Load preferences from local storage
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("shopFilters") || "{}");
        if (saved.selectedCategories) setSelectedCategories(saved.selectedCategories);
        if (saved.selectedSizes) setSelectedSizes(saved.selectedSizes);
        if (saved.selectedColors) setSelectedColors(saved.selectedColors);
        if (saved.selectedMaterials) setSelectedMaterials(saved.selectedMaterials);
        if (saved.sortOption) setSortOption(saved.sortOption);
        if (saved.viewMode) setViewMode(saved.viewMode);
        if (saved.priceRange) setPriceRange(saved.priceRange);
        if (saved.minPrice) setMinPrice(saved.minPrice);
        if (saved.maxPrice) setMaxPrice(saved.maxPrice);
        if (saved.ratingFilter) setRatingFilter(saved.ratingFilter);
        if (saved.inStockOnly !== undefined) setInStockOnly(saved.inStockOnly);
    }, []);

    // Save preferences to local storage
    useEffect(() => {
        localStorage.setItem(
            "shopFilters",
            JSON.stringify({
                selectedCategories,
                selectedSizes,
                selectedColors,
                selectedMaterials,
                sortOption,
                viewMode,
                priceRange,
                minPrice,
                maxPrice,
                ratingFilter,
                inStockOnly,
            })
        );
    }, [
        selectedCategories,
        selectedSizes,
        selectedColors,
        selectedMaterials,
        sortOption,
        viewMode,
        priceRange,
        minPrice,
        maxPrice,
        ratingFilter,
        inStockOnly,
    ]);

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
                else {
                    console.error("Profile fetch error:", profileError.message);
                    toast.error("Failed to load profile.");
                }
            } else if (userError) {
                console.error("User fetch error:", userError.message);
                toast.error("Failed to load user data.");
            }
        }
        fetchProfile();
    }, []);

    // Fetch products, reviews, and variants
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const [
                { data: productData, error: productError, count },
                { data: reviewData, error: reviewError },
                { data: variantData, error: variantError },
            ] = await Promise.all([
                supabase
                    .from("products")
                    .select("*, product_images(image_url)", { count: "exact" })
                    .range(
                        (currentPage - 1) * productsPerPage,
                        currentPage * productsPerPage - 1
                    ),
                supabase.from("reviews").select("product_id, rating, comment, created_at"),
                supabase.from("product_variants").select("*"),
            ]);
            if (productError) {
                console.error("Error fetching products:", productError.message);
                toast.error("Failed to load products.");
            } else {
                setProducts((prev) =>
                    currentPage === 1 ? productData : [...prev, ...productData]
                );
                setTotalProducts(count);
            }
            if (reviewError) {
                console.error("Error fetching reviews:", reviewError.message);
                toast.error("Failed to load reviews.");
            } else {
                setReviews(reviewData);
            }
            if (variantError) {
                console.error("Error fetching variants:", variantError.message);
                toast.error("Failed to load product variants.");
            } else {
                setVariants(variantData);
            }
            setLoading(false);
        }
        fetchData();
    }, [currentPage]);

    // Fetch categories
    useEffect(() => {
        async function fetchCategories() {
            const { data: categoriesData, error } = await supabase
                .from("categories")
                .select("id, name, slug, parent_id")
                .order("parent_id, name");
            if (error) {
                console.error("Error fetching categories:", error.message);
                toast.error("Failed to load categories.");
            } else {
                setCategories(categoriesData);
            }
        }
        fetchCategories();
    }, []);

    // Fetch related products
    useEffect(() => {
        async function fetchRelatedProducts() {
            if (selectedCategories.length > 0) {
                const { data, error } = await supabase
                    .from("products")
                    .select("*, product_images(image_url)")
                    .in("category_id", selectedCategories)
                    .limit(4);
                if (error) {
                    console.error("Error fetching related products:", error.message);
                    toast.error("Failed to load related products.");
                } else {
                    setRelatedProducts(data);
                }
            } else {
                setRelatedProducts([]);
            }
        }
        fetchRelatedProducts();
    }, [selectedCategories]);

    // Load recently viewed from local storage
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
        setRecentlyViewed(saved);
    }, []);

    // Search suggestions
    useEffect(() => {
        const suggestions = [
            ...new Set([
                ...products.map((p) => p.name),
                ...products.map((p) => p.old_category).filter(Boolean),
                ...categories.map((c) => c.name),
                ...variants.map((v) => v.color).filter(Boolean),
                ...variants.map((v) => v.size).filter(Boolean),
            ]),
        ]
            .filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 8);
        setSearchSuggestions(searchQuery ? suggestions : []);
    }, [searchQuery, products, categories, variants]);

    // Compute average ratings
    const getAverageRating = useCallback(
        (productId) => {
            const productReviews = reviews.filter((r) => r.product_id === productId);
            if (productReviews.length === 0) return 0;
            const total = productReviews.reduce((sum, r) => sum + r.rating, 0);
            return total / productReviews.length;
        },
        [reviews]
    );

    // Memoized renderStars function
    const renderStars = useCallback((rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars.push(<FaStar key={i} className="w-4 h-4 text-yellow-400" />);
            } else if (i - 0.5 <= rating) {
                stars.push(
                    <FaStarHalfAlt key={i} className="w-4 h-4 text-yellow-400" />
                );
            } else {
                stars.push(<FaRegStar key={i} className="w-4 h-4 text-yellow-400" />);
            }
        }
        return stars;
    }, []);

    // Client-side filtering
    const displayedProducts = useMemo(() => {
        let result = [...products];
        if (searchQuery) {
            result = result.filter((p) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                categories.find((c) => c.id === p.category_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (selectedCategories.length > 0) {
            result = result.filter((p) => selectedCategories.includes(p.category_id));
        }
        if (selectedSizes.length > 0) {
            result = result.filter((p) =>
                variants.some((v) => v.product_id === p.id && selectedSizes.includes(v.size))
            );
        }
        if (selectedColors.length > 0) {
            result = result.filter((p) =>
                variants.some((v) => v.product_id === p.id && selectedColors.includes(v.color))
            );
        }
        if (selectedMaterials.length > 0) {
            result = result.filter((p) =>
                variants.some((v) => v.product_id === p.id && selectedMaterials.includes(v.material))
            );
        }
        if (inStockOnly) {
            result = result.filter((p) => !p.is_out_of_stock);
        }
        result = result.filter((p) => p.price >= minPrice && p.price <= maxPrice);
        if (ratingFilter) {
            result = result.filter(
                (p) => getAverageRating(p.id) >= parseInt(ratingFilter)
            );
        }
        if (sortOption === "price-asc") {
            result.sort((a, b) => a.price - b.price);
        } else if (sortOption === "price-desc") {
            result.sort((a, b) => b.price - a.price);
        } else if (sortOption === "newest") {
            result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortOption === "rating") {
            result.sort((a, b) => getAverageRating(b.id) - getAverageRating(a.id));
        }
        return result;
    }, [
        products,
        searchQuery,
        selectedCategories,
        selectedSizes,
        selectedColors,
        selectedMaterials,
        inStockOnly,
        minPrice,
        maxPrice,
        ratingFilter,
        sortOption,
        getAverageRating,
        variants,
        categories,
    ]);

    // Group products by category for carousels
    const categoryGroups = useMemo(() => {
        const groups = {};
        products.forEach((p) => {
            const catName =
                p.old_category ||
                categories.find((c) => c.id === p.category_id)?.name ||
                "Other";
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(p);
        });
        return groups;
    }, [products, categories]);

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / productsPerPage);

    // Infinite scroll
    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + document.documentElement.scrollTop >=
                document.documentElement.offsetHeight - 100 &&
                !loading &&
                currentPage < totalPages
            ) {
                setCurrentPage((prev) => prev + 1);
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [loading, currentPage, totalPages]);

    // Handle search with debounce
    const debouncedSearch = useCallback(
        debounce((query) => {
            setSearchQuery(query);
            setCurrentPage(1);
        }, 300),
        []
    );

    // Handle wishlist toggle with toast
    const handleToggleWishlist = useCallback(
        (product) => {
            toggleWishlist(product);
            toast.success(
                `${product.name} ${isInWishlist(product.id) ? "removed from" : "added to"} wishlist!`,
                {
                    position: "top-right",
                    autoClose: 2000,
                    className: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
                }
            );
        },
        [toggleWishlist, isInWishlist]
    );

    // Quick view handlers
    const openQuickView = useCallback(
        (product) => {
            setQuickViewProduct(product);
            setSelectedVariant(null);
            setCurrentImageIndex(0);
            const updatedRecentlyViewed = [
                product,
                ...recentlyViewed.filter((p) => p.id !== product.id),
            ].slice(0, 4);
            setRecentlyViewed(updatedRecentlyViewed);
            localStorage.setItem(
                "recentlyViewed",
                JSON.stringify(updatedRecentlyViewed)
            );
        },
        [recentlyViewed]
    );

    const closeQuickView = useCallback(() => {
        setQuickViewProduct(null);
        setSelectedVariant(null);
        setCurrentImageIndex(0);
    }, []);

    // Reset filters
    const resetFilters = useCallback(() => {
        setSelectedCategories([]);
        setSelectedSizes([]);
        setSelectedColors([]);
        setSelectedMaterials([]);
        setPriceRange([0, 30000]);
        setMinPrice(0);
        setMaxPrice(30000);
        setRatingFilter("");
        setInStockOnly(false);
        setSearchQuery("");
        setCurrentPage(1);
    }, []);

    // Handle variant selection
    const handleVariantSelect = useCallback((variant) => {
        setSelectedVariant(variant);
    }, []);

    // Handle image carousel navigation
    const nextImage = useCallback(() => {
        if (!quickViewProduct) return;
        const images = [
            quickViewProduct.image_url,
            ...(quickViewProduct.product_images?.map((img) => img.image_url) || []),
        ];
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, [quickViewProduct]);

    const prevImage = useCallback(() => {
        if (!quickViewProduct) return;
        const images = [
            quickViewProduct.image_url,
            ...(quickViewProduct.product_images?.map((img) => img.image_url) || []),
        ];
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }, [quickViewProduct]);

    // Focus trap for modal
    useEffect(() => {
        if (quickViewProduct && modalRef.current) {
            modalRef.current.focus();
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleKeyDown = (e) => {
                if (e.key === "Tab") {
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
                if (e.key === "Escape") {
                    closeQuickView();
                }
            };

            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [quickViewProduct, closeQuickView]);

    if (loading && currentPage === 1) return <DressLoader />;

    // Structured data for SEO
    const structuredData = displayedProducts.map((product) => ({
        "@context": "https://schema.org/",
        "@type": "Product",
        name: product.name,
        image: product.image_url.startsWith("data:image")
            ? "/placeholder.jpg"
            : [
                product.image_url,
                ...(product.product_images?.map((img) => img.image_url) || []),
            ],
        description: product.description,
        sku: product.id,
        offers: {
            "@type": "Offer",
            priceCurrency: "NGN",
            price:
                product.discount_percentage > 0
                    ? (product.price * (1 - product.discount_percentage / 100)).toFixed(2)
                    : product.price.toFixed(2),
            availability: product.is_out_of_stock
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
        },
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: getAverageRating(product.id).toFixed(1),
            reviewCount: reviews.filter((r) => r.product_id === product.id).length,
        },
    }));

    // Available sizes, colors, and materials for filters
    const availableSizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
    const availableColors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
    const availableMaterials = [...new Set(variants.map((v) => v.material).filter(Boolean))];

    const shopSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Shop - Vian Clothing Hub",
        "description": "Browse our collection of stylish ready-to-wear fashion with fast delivery across Nigeria.",
        "url": "https://yourdomain.com/shop",
        "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://yourdomain.com/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Shop"
                }
            ]
        },
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": displayedProducts.slice(0, 10).map((product, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Product",
                    "name": product.name,
                    "image": product.image_url,
                    "url": `https://yourdomain.com/product/${product.id}`,
                    "description": product.description?.substring(0, 200) || "Stylish fashion item from Vian Clothing Hub.",
                    "sku": product.id.toString(),
                    "offers": {
                        "@type": "Offer",
                        "price": product.price,
                        "priceCurrency": "NGN",
                        "availability": product.is_out_of_stock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
                    },
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": getAverageRating(product.id),
                        "reviewCount": reviews.filter((r) => r.product_id === product.id).length
                    }
                }
            }))
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <Helmet>
                <title>Shop Fashion - Explore Dresses, Shirts, and More</title>
                <meta
                    name="description"
                    content={`Shop ${selectedCategories.length ? selectedCategories.join(", ") : "stylish"} fashion at Vian Clothing Hub. Fast delivery across Nigeria.`}
                />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href="https://vianclothinghub.com.ng/shop" />
                <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(shopSchema) }}
                />
            </Helmet>
            <ToastContainer />
            <Navbar
                profile={profile}
                onCartClick={() => setIsCartOpen(true)}
                cartItemCount={cart.length}
            />
            <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Promotional Banner with Slideshow */}
                {promotions.length > 0 && (
                    <div className="mb-12 relative rounded-2xl overflow-hidden shadow-lg">
                        <div className="relative w-full h-64 sm:h-80">
                            {promotions.map((promotion, index) => (
                                <div
                                    key={promotion.id}
                                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                                        index === currentPromoIndex ? "opacity-100" : "opacity-0"
                                    }`}
                                    role="region"
                                    aria-live="polite"
                                    aria-label={`Promotion: ${promotion.title}`}
                                >
                                    <img
                                        src={promotion.image_url || "/placeholder.jpg"}
                                        alt={promotion.title || "Sale Promotion"}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/40 flex items-center justify-center">
                                        <div className="text-center text-white">
                                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                                {promotion.title || "Flash Sale!"} Up to{" "}
                                                {promotion.discount_percentage || 7}% Off
                                            </h2>
                                            <p className="text-lg sm:text-xl mt-2">
                                                Hurry, ends in {timeLeft[promotion.id] || "Loading..."}
                                            </p>
                                            <button
                                                className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-md"
                                                aria-label={`Shop ${promotion.title} items`}
                                                onClick={() => {
                                                    if (promotion.promotion_categories && promotion.promotion_categories.length > 0) {
                                                        setSelectedCategories(promotion.promotion_categories.map(pc => pc.category_id));
                                                    }
                                                }}
                                            >
                                                Shop Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {promotions.length > 1 && (
                            <>
                                {/* Navigation Arrows */}
                                <button
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                                    onClick={() =>
                                        setCurrentPromoIndex((prev) =>
                                            (prev - 1 + promotions.length) % promotions.length
                                        )
                                    }
                                    aria-label="Previous promotion"
                                >
                                    <FaChevronLeft className="w-5 h-5 text-gray-800" />
                                </button>
                                <button
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                                    onClick={() =>
                                        setCurrentPromoIndex((prev) => (prev + 1) % promotions.length)
                                    }
                                    aria-label="Next promotion"
                                >
                                    <FaChevronRight className="w-5 h-5 text-gray-800" />
                                </button>
                                {/* Navigation Dots */}
                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                                    {promotions.map((_, index) => (
                                        <button
                                            key={index}
                                            className={`w-3 h-3 rounded-full ${
                                                index === currentPromoIndex
                                                    ? "bg-white"
                                                    : "bg-white/50 hover:bg-white/80"
                                            } transition-colors`}
                                            onClick={() => setCurrentPromoIndex(index)}
                                            aria-label={`Go to promotion ${index + 1}`}
                                            aria-current={index === currentPromoIndex ? "true" : "false"}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Search Bar with Suggestions */}
                <div className="mb-8 relative max-w-4xl mx-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search dresses, shirts, accessories..."
                            onChange={(e) => debouncedSearch(e.target.value)}
                            className="w-full p-4 pl-12 text-gray-900 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-sm"
                            aria-label="Search products or categories"
                            ref={searchInputRef}
                        />
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        {searchSuggestions.length > 0 && (
                            <ul className="absolute z-20 w-full bg-white text-gray-900 border border-gray-200 rounded-lg mt-2 shadow-xl max-h-60 overflow-y-auto">
                                {searchSuggestions.map((suggestion, index) => (
                                    <li
                                        key={index}
                                        className="p-3 text-gray-700 hover:bg-purple-100 cursor-pointer transition-colors duration-200"
                                        onClick={() => {
                                            setSearchQuery(suggestion);
                                            setSearchSuggestions([]);
                                            searchInputRef.current.focus();
                                        }}
                                        role="option"
                                        aria-label={`Select ${suggestion}`}
                                    >
                                        {suggestion}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Filter/Sort Bar */}
                <div className="sticky top-0 z-10 bg-gray-100 py-4 mb-8">
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            className="md:hidden px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                            onClick={() => setIsMobileFilterOpen(true)}
                            aria-label="Open filters"
                        >
                            Filters
                        </button>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="p-2 text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            aria-label="Sort products"
                        >
                            <option value="">Sort By</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="newest">Newest Arrivals</option>
                            <option value="rating">Top Rated</option>
                        </select>
                        <button
                            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            aria-label="Toggle advanced filters"
                        >
                            Advanced Filters
                        </button>
                        <button
                            className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                            onClick={resetFilters}
                            aria-label="Clear all filters"
                        >
                            Clear Filters
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700"} hover:bg-purple-700 hover:text-white transition-colors`}
                                aria-label="Grid view"
                            >
                                <FaTh />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-lg ${viewMode === "list" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700"} hover:bg-purple-700 hover:text-white transition-colors`}
                                aria-label="List view"
                            >
                                <FaList />
                            </button>
                        </div>
                    </div>
                    {(isFilterOpen || isMobileFilterOpen) && (
                        <div className="mt-4 bg-white p-6 rounded-2xl shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                                <button
                                    className="md:hidden text-gray-600 hover:text-gray-800"
                                    onClick={() => setIsMobileFilterOpen(false)}
                                    aria-label="Close filters"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Categories
                                    </label>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {categories.map((cat) => (
                                            <div key={cat.id} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategories.includes(cat.id)}
                                                    onChange={() => {
                                                        setSelectedCategories((prev) =>
                                                            prev.includes(cat.id)
                                                                ? prev.filter((id) => id !== cat.id)
                                                                : [...prev, cat.id]
                                                        );
                                                    }}
                                                    className="h-4 w-4 text-purple-600 focus:ring-purple-600 rounded"
                                                    aria-label={`Filter by ${cat.name}`}
                                                />
                                                <span className={cat.parent_id ? "ml-4 text-gray-600" : "text-gray-800"}>
                                                    {cat.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Price Range (₦{minPrice.toLocaleString()} - ₦{maxPrice.toLocaleString()})
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={minPrice}
                                            onChange={(e) =>
                                                setMinPrice(Math.max(0, parseInt(e.target.value) || 0))
                                            }
                                            className="p-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-purple-600"
                                            aria-label="Minimum price"
                                        />
                                        <input
                                            type="number"
                                            value={maxPrice}
                                            onChange={(e) =>
                                                setMaxPrice(Math.min(30000, parseInt(e.target.value) || 30000))
                                            }
                                            className="p-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-purple-600"
                                            aria-label="Maximum price"
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="30000"
                                        step="100"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                                        className="w-full mt-2"
                                        aria-label="Price range slider"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rating
                                    </label>
                                    <select
                                        value={ratingFilter}
                                        onChange={(e) => setRatingFilter(e.target.value)}
                                        className="p-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-purple-600"
                                        aria-label="Filter by rating"
                                    >
                                        <option value="">All Ratings</option>
                                        <option value="4">4+ Stars</option>
                                        <option value="3">3+ Stars</option>
                                        <option value="2">2+ Stars</option>
                                    </select>
                                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                                        Availability
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={inStockOnly}
                                            onChange={() => setInStockOnly(!inStockOnly)}
                                            className="h-4 w-4 text-purple-600 focus:ring-purple-600 rounded"
                                            aria-label="Show in stock only"
                                        />
                                        <span>In Stock Only</span>
                                    </div>
                                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                                        Size
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableSizes.map((size) => (
                                            <button
                                                key={size}
                                                className={`px-3 py-1 border rounded-full ${selectedSizes.includes(size) ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"} hover:bg-purple-600 hover:text-white transition-colors`}
                                                onClick={() =>
                                                    setSelectedSizes((prev) =>
                                                        prev.includes(size)
                                                            ? prev.filter((s) => s !== size)
                                                            : [...prev, size]
                                                    )
                                                }
                                                aria-label={`Filter by size ${size}`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                                        Color
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableColors.map((color) => (
                                            <button
                                                key={color}
                                                className={`w-8 h-8 rounded-full border ${selectedColors.includes(color) ? "ring-2 ring-purple-600" : ""}`}
                                                style={{ backgroundColor: color.toLowerCase() }}
                                                onClick={() =>
                                                    setSelectedColors((prev) =>
                                                        prev.includes(color)
                                                            ? prev.filter((c) => c !== color)
                                                            : [...prev, color]
                                                    )
                                                }
                                                aria-label={`Filter by color ${color}`}
                                            ></button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 flex gap-2">
                                <button
                                    className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                                    onClick={() => {
                                        setIsFilterOpen(false);
                                        setIsMobileFilterOpen(false);
                                    }}
                                    aria-label="Apply filters"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                    onClick={resetFilters}
                                    aria-label="Clear all filters"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* All Products */}
                <div className="mt-12">
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
                        Explore All Products
                    </h2>
                    {loading && currentPage > 1 && (
                        <div className="text-center py-4">
                            <DressLoader />
                        </div>
                    )}
                    <div
                        className={
                            viewMode === "grid"
                                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                                : "space-y-6"
                        }
                        aria-live="polite"
                    >
                        {displayedProducts.length > 0 ? (
                            displayedProducts.map((product) => {
                                const productVariants = variants.filter((v) => v.product_id === product.id);
                                return (
                                    <div
                                        key={product.id}
                                        className={
                                            viewMode === "grid"
                                                ? "bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300 relative group"
                                                : "bg-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row gap-6 border border-gray-100 hover:border-purple-300"
                                        }
                                        role="article"
                                        aria-label={`Product: ${product.name}${product.is_on_sale ? `, on sale with ${product.discount_percentage}% off` : ""}`}
                                    >
                                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                                            {product.is_on_sale && (
                                                <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                                                    Sale {product.discount_percentage}% Off
                                                </span>
                                            )}
                                            {product.is_out_of_stock && (
                                                <span className="bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                                                    Out of Stock
                                                </span>
                                            )}
                                            {product.is_new && (
                                                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleToggleWishlist(product)}
                                            className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                            aria-label={
                                                isInWishlist(product.id)
                                                    ? "Remove from wishlist"
                                                    : "Add to wishlist"
                                            }
                                        >
                                            {isInWishlist(product.id) ? (
                                                <FaHeart className="text-red-500 w-5 h-5 animate-pulse" />
                                            ) : (
                                                <FaRegHeart className="text-gray-400 group-hover:text-red-400 w-5 h-5" />
                                            )}
                                        </button>
                                        <a href={`/product/${product.id}`} className="block">
                                            <div
                                                className={
                                                    viewMode === "grid"
                                                        ? "relative overflow-hidden rounded-xl aspect-[3/4] mb-4"
                                                        : "relative overflow-hidden rounded-xl w-full sm:w-1/3 aspect-[3/4]"
                                                }
                                            >
                                                <img
                                                    src={
                                                        product.image_url.startsWith("data:image")
                                                            ? "/placeholder.jpg"
                                                            : product.image_url
                                                    }
                                                    srcSet={
                                                        product.image_url.startsWith("data:image")
                                                            ? undefined
                                                            : `${product.image_url}?format=webp&w=300 300w, ${product.image_url}?format=webp&w=600 600w`
                                                    }
                                                    sizes="(max-width: 600px) 300px, 600px"
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        openQuickView(product);
                                                    }}
                                                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-purple-600 px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-purple-600 hover:text-white"
                                                    aria-label={`Quick view ${product.name}`}
                                                >
                                                    Quick View
                                                </button>
                                            </div>
                                        </a>
                                        <div
                                            className={
                                                viewMode === "grid" ? "space-y-2" : "flex-1 space-y-2"
                                            }
                                        >
                                            <h2
                                                className={
                                                    viewMode === "grid"
                                                        ? "text-xl font-bold text-gray-900 line-clamp-1"
                                                        : "text-lg font-bold text-gray-900 line-clamp-2"
                                                }
                                            >
                                                {product.name}
                                            </h2>
                                            <div className="flex gap-2 items-center">
                                                <div className="flex gap-0.5">
                                                    {renderStars(getAverageRating(product.id))}
                                                </div>
                                                <span className="text-gray-500 text-sm">
                                                    ({reviews.filter((r) => r.product_id === product.id).length} reviews)
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm font-light line-clamp-2 min-h-[48px]">
                                                {product.description}
                                            </p>
                                            <div className="text-xl font-semibold">
                                                {product.discount_percentage > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-500 line-through">
                                                            ₦{Number(product.price).toLocaleString()}
                                                        </span>
                                                        <span className="text-green-600">
                                                            ₦{(
                                                                product.price *
                                                                (1 - product.discount_percentage / 100)
                                                            ).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-purple-700">
                                                        ₦{Number(product.price).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            {productVariants.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {productVariants.map((variant) => (
                                                        <button
                                                            key={variant.id}
                                                            className={`px-3 py-1 border rounded-full ${selectedVariant?.id === variant.id ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"} hover:bg-purple-600 hover:text-white transition-colors`}
                                                            onClick={() => handleVariantSelect(variant)}
                                                            aria-label={`Select variant ${variant.size} ${variant.color}`}
                                                        >
                                                            {variant.size} {variant.color}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <button
                                                onClick={() =>
                                                    addToCart({
                                                        ...product,
                                                        quantity: 1,
                                                        variant: selectedVariant,
                                                        is_on_sale: product.is_on_sale,
                                                        discount_percentage: product.discount_percentage,
                                                        is_out_of_stock: product.is_out_of_stock,
                                                    })
                                                }
                                                disabled={product.is_out_of_stock}
                                                className={`mt-4 w-full py-3 rounded-full flex items-center justify-center gap-2 font-medium transition-all duration-300 ${product.is_out_of_stock ? "bg-gray-400 cursor-not-allowed text-white" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"}`}
                                                aria-label={`Add ${product.name} to cart`}
                                            >
                                                <FaShoppingCart className="w-4 h-4" />
                                                <span>
                                                    {product.is_out_of_stock ? "Out of Stock" : "Add to Cart"}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-gray-600 col-span-full py-8">
                                No products match your filters. Try adjusting your search or filters.
                            </p>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {currentPage < totalPages && (
                    <div className="mt-8 flex justify-center gap-4 items-center mb-10">
                        <button
                            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            aria-label="Previous page"
                        >
                            Previous
                        </button>
                        <span className="text-gray-600" aria-live="polite">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            aria-label="Next page"
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Category Carousels */}
                {Object.keys(categoryGroups).map((catName) => (
                    <div key={catName} className="mt-12">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
                            Shop {catName}
                        </h2>
                        <p className="text-gray-600 mb-4">Explore our {catName} collection featuring bold African designs.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {categoryGroups[catName].slice(0, 4).map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300 relative group"
                                    role="article"
                                    aria-label={`Product: ${product.name}${product.is_on_sale ? `, on sale with ${product.discount_percentage}% off` : ""}`}
                                >
                                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                                        {product.is_on_sale && (
                                            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                                                Sale {product.discount_percentage}% Off
                                            </span>
                                        )}
                                        {product.is_out_of_stock && (
                                            <span className="bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                                                Out of Stock
                                            </span>
                                        )}
                                        {product.is_new && (
                                            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
                                                New
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleToggleWishlist(product)}
                                        className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                        aria-label={
                                            isInWishlist(product.id)
                                                ? "Remove from wishlist"
                                                : "Add to wishlist"
                                        }
                                    >
                                        {isInWishlist(product.id) ? (
                                            <FaHeart className="text-red-500 w-5 h-5 animate-pulse" />
                                        ) : (
                                            <FaRegHeart className="text-gray-400 group-hover:text-red-400 w-5 h-5" />
                                        )}
                                    </button>
                                    <a href={`/product/${product.id}`} className="block">
                                        <div className="relative overflow-hidden rounded-xl aspect-[3/4] mb-4">
                                            <img
                                                src={
                                                    product.image_url.startsWith("data:image")
                                                        ? "/placeholder.jpg"
                                                        : product.image_url
                                                }
                                                srcSet={
                                                    product.image_url.startsWith("data:image")
                                                        ? undefined
                                                        : `${product.image_url}?format=webp&w=300 300w, ${product.image_url}?format=webp&w=600 600w`
                                                }
                                                sizes="(max-width: 600px) 300px, 600px"
                                                alt={product.name}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    openQuickView(product);
                                                }}
                                                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-purple-600 px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-purple-600 hover:text-white"
                                                aria-label={`Quick view ${product.name}`}
                                            >
                                                Quick View
                                            </button>
                                        </div>
                                    </a>
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-bold text-gray-900 line-clamp-1">
                                            {product.name}
                                        </h2>
                                        <div className="flex gap-2 items-center">
                                            <div className="flex gap-0.5">
                                                {renderStars(getAverageRating(product.id))}
                                            </div>
                                            <span className="text-gray-500 text-sm">
                                                ({reviews.filter((r) => r.product_id === product.id).length} reviews)
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-sm font-light line-clamp-2 min-h-[48px]">
                                            {product.description}
                                        </p>
                                        <div className="text-xl font-semibold">
                                            {product.discount_percentage > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-500 line-through">
                                                        ₦{Number(product.price).toLocaleString()}
                                                    </span>
                                                    <span className="text-green-600">
                                                        ₦{(
                                                            product.price *
                                                            (1 - product.discount_percentage / 100)
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-purple-700">
                                                    ₦{Number(product.price).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() =>
                                                addToCart({
                                                    ...product,
                                                    quantity: 1,
                                                    is_on_sale: product.is_on_sale,
                                                    discount_percentage: product.discount_percentage,
                                                    is_out_of_stock: product.is_out_of_stock,
                                                })
                                            }
                                            disabled={product.is_out_of_stock}
                                            className={`mt-4 w-full py-3 rounded-full flex items-center justify-center gap-2 font-medium transition-all duration-300 ${product.is_out_of_stock ? "bg-gray-400 cursor-not-allowed text-white" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"}`}
                                            aria-label={`Add ${product.name} to cart`}
                                        >
                                            <FaShoppingCart className="w-4 h-4" />
                                            <span>
                                                {product.is_out_of_stock ? "Out of Stock" : "Add to Cart"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Recently Viewed Products */}
                {recentlyViewed.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
                            Recently Viewed
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {recentlyViewed.map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300"
                                >
                                    <a href={`/product/${product.id}`} className="block">
                                        <img
                                            src={
                                                product.image_url.startsWith("data:image")
                                                    ? "/placeholder.jpg"
                                                    : product.image_url
                                            }
                                            alt={product.name}
                                            className="w-full h-48 object-cover rounded-lg mb-4 transition-transform duration-300 hover:scale-105"
                                            loading="lazy"
                                        />
                                    </a>
                                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                                        {product.name}
                                    </h3>
                                    <div className="text-purple-700 font-semibold">
                                        ₦{Number(product.price).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
                            You May Also Like
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {relatedProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300"
                                >
                                    <a href={`/product/${product.id}`} className="block">
                                        <img
                                            src={
                                                product.image_url.startsWith("data:image")
                                                    ? "/placeholder.jpg"
                                                    : product.image_url
                                            }
                                            alt={product.name}
                                            className="w-full h-48 object-cover rounded-lg mb-4 transition-transform duration-300 hover:scale-105"
                                            loading="lazy"
                                        />
                                    </a>
                                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                                        {product.name}
                                    </h3>
                                    <div className="text-purple-700 font-semibold">
                                        ₦{Number(product.price).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick View Modal */}
                {quickViewProduct && (
                    <div
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                        role="dialog"
                        aria-modal="true"
                        tabIndex="-1"
                        ref={modalRef}
                    >
                        <div className="bg-white p-6 rounded-2xl max-w-2xl w-full relative">
                            <button
                                onClick={closeQuickView}
                                className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
                                aria-label="Close quick view"
                            >
                                <FaTimes className="w-6 h-6" />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative">
                                    <img
                                        src={
                                            quickViewProduct.product_images?.[currentImageIndex]?.image_url ||
                                                quickViewProduct.image_url.startsWith("data:image")
                                                ? "/placeholder.jpg"
                                                : quickViewProduct.image_url
                                        }
                                        alt={quickViewProduct.name}
                                        className="w-full h-80 object-cover rounded-lg"
                                    />
                                    {(quickViewProduct.product_images?.length > 0 || true) && (
                                        <div className="absolute top-1/2 transform -translate-y-1/2 flex justify-between w-full px-4">
                                            <button
                                                onClick={prevImage}
                                                className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                                                aria-label="Previous image"
                                            >
                                                <FaChevronLeft />
                                            </button>
                                            <button
                                                onClick={nextImage}
                                                className="p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
                                                aria-label="Next image"
                                            >
                                                <FaChevronRight />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex gap-2 mt-2 justify-center">
                                        {[quickViewProduct.image_url, ...(quickViewProduct.product_images?.map((img) => img.image_url) || [])].map((img, index) => (
                                            <img
                                                key={index}
                                                src={img.startsWith("data:image") ? "/placeholder.jpg" : img}
                                                alt={`${quickViewProduct.name} thumbnail ${index + 1}`}
                                                className={`w-16 h-16 object-cover rounded-lg cursor-pointer ${currentImageIndex === index ? "ring-2 ring-purple-600" : ""}`}
                                                onClick={() => setCurrentImageIndex(index)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                        {quickViewProduct.name}
                                    </h2>
                                    <div className="flex gap-2 items-center mb-4">
                                        <div className="flex gap-0.5">
                                            {renderStars(getAverageRating(quickViewProduct.id))}
                                        </div>
                                        <span className="text-gray-500 text-sm">
                                            ({reviews.filter((r) => r.product_id === quickViewProduct.id).length} reviews)
                                        </span>
                                    </div>
                                    <p className="text-gray-600 mb-4 line-clamp-3">
                                        {quickViewProduct.description}
                                    </p>
                                    <div className="text-xl font-semibold mb-4">
                                        {quickViewProduct.discount_percentage > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-500 line-through">
                                                    ₦{Number(quickViewProduct.price).toLocaleString()}
                                                </span>
                                                <span className="text-green-600">
                                                    ₦{(
                                                        quickViewProduct.price *
                                                        (1 - quickViewProduct.discount_percentage / 100)
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-purple-700">
                                                ₦{Number(quickViewProduct.price).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    {variants.filter((v) => v.product_id === quickViewProduct.id).length > 0 && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Select Variant
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {variants
                                                    .filter((v) => v.product_id === quickViewProduct.id)
                                                    .map((variant) => (
                                                        <button
                                                            key={variant.id}
                                                            className={`px-3 py-1 border rounded-full ${selectedVariant?.id === variant.id ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"} hover:bg-purple-600 hover:text-white transition-colors`}
                                                            onClick={() => handleVariantSelect(variant)}
                                                            aria-label={`Select variant ${variant.size} ${variant.color}`}
                                                        >
                                                            {variant.size} {variant.color}
                                                            {variant.additional_price > 0 && ` (+₦${variant.additional_price})`}
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() =>
                                            addToCart({
                                                ...quickViewProduct,
                                                quantity: 1,
                                                variant: selectedVariant,
                                                is_on_sale: quickViewProduct.is_on_sale,
                                                discount_percentage: quickViewProduct.discount_percentage,
                                                is_out_of_stock: quickViewProduct.is_out_of_stock,
                                            })
                                        }
                                        disabled={quickViewProduct.is_out_of_stock}
                                        className={`w-full py-3 rounded-full flex items-center justify-center gap-2 font-medium transition-all duration-300 ${quickViewProduct.is_out_of_stock ? "bg-gray-400 cursor-not-allowed text-white" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"}`}
                                        aria-label={`Add ${quickViewProduct.name} to cart`}
                                    >
                                        <FaShoppingCart className="w-4 h-4" />
                                        <span>
                                            {quickViewProduct.is_out_of_stock ? "Out of Stock" : "Add to Cart"}
                                        </span>
                                    </button>
                                    <div className="mt-4">
                                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                                            Customer Reviews
                                        </h3>
                                        <div className="max-h-40 overflow-y-auto space-y-2">
                                            {reviews
                                                .filter((r) => r.product_id === quickViewProduct.id)
                                                .slice(0, 3)
                                                .map((review) => (
                                                    <div key={review.id} className="border-b border-gray-200 pb-2">
                                                        <div className="flex gap-1">
                                                            {renderStars(review.rating)}
                                                        </div>
                                                        <p className="text-sm text-gray-600">{review.comment}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {new Date(review.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <FloatingChatButton cartItemCount={cart.length} />
            </div>
            <Footer />
        </div>
    );
}