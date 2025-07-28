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
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import debounce from "lodash.debounce";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";
import CartPanel from "@/components/CartPanel";
import DressLoader from "@/components/DressLoader";
import { Helmet } from "react-helmet";

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage] = useState(30);
    const [sortOption, setSortOption] = useState("");
    const [selectedCategories, setSelectedCategories] = useState([]);
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
    const modalRef = useRef(null);
    const searchInputRef = useRef(null);

    // Load preferences from local storage
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("shopFilters") || "{}");
        if (saved.selectedCategories)
            setSelectedCategories(saved.selectedCategories);
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
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();
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

    // Fetch products and reviews
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const [
                { data: productData, error: productError, count },
                { data: reviewData, error: reviewError },
            ] = await Promise.all([
                supabase
                    .from("products")
                    .select("*, product_images(image_url)", { count: "exact" })
                    .range(
                        (currentPage - 1) * productsPerPage,
                        currentPage * productsPerPage - 1
                    ),
                supabase.from("reviews").select("product_id, rating"),
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
            ]),
        ]
            .filter((item) => item.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 5);
        setSearchSuggestions(searchQuery ? suggestions : []);
    }, [searchQuery, products, categories]);

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
                p.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (selectedCategories.length > 0) {
            result = result.filter((p) => selectedCategories.includes(p.category_id));
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
            result.sort((a, b) => b.price - b.price);
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
        inStockOnly,
        minPrice,
        maxPrice,
        ratingFilter,
        sortOption,
        getAverageRating,
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
        }, 300),
        []
    );

    // Handle wishlist toggle with toast
    const handleToggleWishlist = useCallback(
        (product) => {
            toggleWishlist(product);
            toast.success(
                `${product.name} ${isInWishlist(product.id) ? "removed from" : "added to"
                } wishlist!`,
                {
                    position: "top-right",
                    autoClose: 2000,
                }
            );
        },
        [toggleWishlist, isInWishlist]
    );

    // Quick view handlers
    const openQuickView = useCallback(
        (product) => {
            setQuickViewProduct(product);
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
    }, []);

    // Reset filters
    const resetFilters = useCallback(() => {
        setSelectedCategories([]);
        setPriceRange([0, 30000]);
        setMinPrice(0);
        setMaxPrice(30000);
        setRatingFilter("");
        setInStockOnly(false);
        setSearchQuery("");
        setCurrentPage(1);
    }, []);

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
            ? "/path/to/placeholder.jpg"
            : product.image_url,
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

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Helmet>
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>
            <ToastContainer />
            <Navbar
                profile={profile}
                onCartClick={() => setIsCartOpen(true)}
                cartItemCount={cart.length}
            />
            <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Promotional Banner */}
                {products.some((p) => p.is_on_sale) && (
                    <div className="mb-12 relative rounded-xl overflow-hidden">
                        <img
                            src="/path/to/sale-banner.jpg"
                            alt="Sale Promotion"
                            className="w-full h-64 object-cover"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="text-center text-white">
                                <h2 className="text-3xl font-bold">Limited Time Sale!</h2>
                                <p className="text-lg mt-2">Up to 7% off on select items</p>
                                <button
                                    className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                    aria-label="Shop sale items"
                                    onClick={() =>
                                        setSelectedCategories(
                                            categories
                                                .filter((c) =>
                                                    products.some(
                                                        (p) => p.is_on_sale && p.category_id === c.id
                                                    )
                                                )
                                                .map((c) => c.id)
                                        )
                                    }
                                >
                                    Shop Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar with Suggestions */}
                <div className="mb-8 relative">
                    <div className="relative max-w-3xl mx-auto">
                        <input
                            type="text"
                            placeholder="Search products or categories..."
                            onChange={(e) => debouncedSearch(e.target.value)}
                            className="w-full p-3 pl-10 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            aria-label="Search products or categories"
                            ref={searchInputRef}
                        />
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        {searchSuggestions.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg">
                                {searchSuggestions.map((suggestion, index) => (
                                    <li
                                        key={index}
                                        className="p-2 hover:bg-purple-100 cursor-pointer"
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
                <div className="sticky top-0 z-10 bg-gray-50 py-4 mb-8">
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            className="md:hidden p-2 bg-purple-600 text-white rounded-lg"
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
                            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            aria-label="Toggle advanced filters"
                        >
                            Advanced Filters
                        </button>
                        <button
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            onClick={resetFilters}
                            aria-label="Clear all filters"
                        >
                            Clear Filters
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-lg ${viewMode === "grid"
                                        ? "bg-purple-600 text-white"
                                        : "bg-gray-200 text-gray-700"
                                    }`}
                                aria-label="Grid view"
                            >
                                <FaTh />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-lg ${viewMode === "list"
                                        ? "bg-purple-600 text-white"
                                        : "bg-gray-200 text-gray-700"
                                    }`}
                                aria-label="List view"
                            >
                                <FaList />
                            </button>
                        </div>
                    </div>
                    {(isFilterOpen || isMobileFilterOpen) && (
                        <div className="mt-4 bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-lg font-semibold mb-4">Filters</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Categories
                                    </label>
                                    <div className="max-h-64 overflow-y-auto">
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
                                                    className="h-4 w-4 text-purple-600 focus:ring-purple-600"
                                                    aria-label={`Filter by ${cat.name}`}
                                                />
                                                <span className={cat.parent_id ? "ml-4" : ""}>
                                                    {cat.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Price Range (₦{minPrice} - ₦{maxPrice})
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={minPrice}
                                            onChange={(e) =>
                                                setMinPrice(Math.max(0, parseInt(e.target.value) || 0))
                                            }
                                            className="p-2 border border-gray-200 rounded-lg w-full"
                                            aria-label="Minimum price"
                                        />
                                        <input
                                            type="number"
                                            value={maxPrice}
                                            onChange={(e) =>
                                                setMaxPrice(
                                                    Math.min(30000, parseInt(e.target.value) || 30000)
                                                )
                                            }
                                            className="p-2 border border-gray-200 rounded-lg w-full"
                                            aria-label="Maximum price"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Rating
                                    </label>
                                    <select
                                        value={ratingFilter}
                                        onChange={(e) => setRatingFilter(e.target.value)}
                                        className="p-2 border border-gray-200 rounded-lg w-full"
                                        aria-label="Filter by rating"
                                    >
                                        <option value="">All Ratings</option>
                                        <option value="4">4+ Stars</option>
                                        <option value="3">3+ Stars</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Availability
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={inStockOnly}
                                            onChange={() => setInStockOnly(!inStockOnly)}
                                            className="h-4 w-4 text-purple-600 focus:ring-purple-600"
                                            aria-label="Show in stock only"
                                        />
                                        <span>In Stock Only</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button
                                    className="p-2 bg-purple-600 text-white rounded-lg"
                                    onClick={() => {
                                        setIsFilterOpen(false);
                                        setIsMobileFilterOpen(false);
                                    }}
                                    aria-label="Apply filters"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    className="p-2 bg-red-600 text-white rounded-lg"
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        All Products
                    </h2>
                    <div
                        className={
                            viewMode === "grid"
                                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6"
                                : "space-y-6"
                        }
                        aria-live="polite"
                    >
                        {displayedProducts.length > 0 ? (
                            displayedProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className={
                                        viewMode === "grid"
                                            ? "bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300 relative group"
                                            : "bg-white p-6 rounded-xl shadow-md flex flex-col sm:flex-row gap-6 border border-gray-100 hover:border-purple-300"
                                    }
                                    role="article"
                                    aria-label={`Product: ${product.name}${product.is_on_sale
                                            ? `, on sale with ${product.discount_percentage}% off`
                                            : ""
                                        }`}
                                >
                                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                                        {product.is_on_sale && (
                                            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
                                                Sale {product.discount_percentage}% Off
                                            </span>
                                        )}
                                        {product.is_out_of_stock && (
                                            <span className="bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
                                                Out of Stock
                                            </span>
                                        )}
                                        {product.is_new && (
                                            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
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
                                            <FaHeart className="text-red-500 w-5 h-5" />
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
                                                        ? "/path/to/placeholder.jpg"
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
                                                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-purple-600 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
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
                                                    ? "text-2xl font-bold text-gray-900 line-clamp-1"
                                                    : "text-xl font-bold text-gray-900 line-clamp-2"
                                            }
                                        >
                                            {product.name}
                                        </h2>
                                        <div className="flex gap-2 items-center">
                                            <div className="flex gap-0.5">
                                                {renderStars(getAverageRating(product.id))}
                                            </div>
                                            <span className="text-gray-500 text-sm">
                                                (
                                                {
                                                    reviews.filter((r) => r.product_id === product.id)
                                                        .length
                                                }{" "}
                                                reviews)
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
                                                        ₦
                                                        {(
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
                                            className={`mt-4 w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${product.is_out_of_stock
                                                    ? "bg-gray-400 cursor-not-allowed text-white"
                                                    : "bg-purple-600 hover:bg-purple-700 text-white"
                                                }`}
                                            aria-label={`Add ${product.name} to cart`}
                                        >
                                            <FaShoppingCart className="w-4 h-4" />
                                            <span>
                                                {product.is_out_of_stock
                                                    ? "Out of Stock"
                                                    : "Add to Cart"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-600 col-span-full">
                                No products match your filters.
                            </p>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {currentPage < totalPages && (
                    <div className="mt-8 flex justify-center gap-2 items-center mb-10">
                        <button
                            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
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
                            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            onClick={() =>
                                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                            }
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            Shop {catName}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {categoryGroups[catName].slice(0, 4).map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300 relative group"
                                    role="article"
                                    aria-label={`Product: ${product.name}${product.is_on_sale
                                            ? `, on sale with ${product.discount_percentage}% off`
                                            : ""
                                        }`}
                                >
                                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                                        {product.is_on_sale && (
                                            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
                                                Sale {product.discount_percentage}% Off
                                            </span>
                                        )}
                                        {product.is_out_of_stock && (
                                            <span className="bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
                                                Out of Stock
                                            </span>
                                        )}
                                        {product.is_new && (
                                            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
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
                                            <FaHeart className="text-red-500 w-5 h-5" />
                                        ) : (
                                            <FaRegHeart className="text-gray-400 group-hover:text-red-400 w-5 h-5" />
                                        )}
                                    </button>
                                    <a href={`/product/${product.id}`} className="block">
                                        <div className="relative overflow-hidden rounded-xl aspect-[3/4] mb-4">
                                            <img
                                                src={
                                                    product.image_url.startsWith("data:image")
                                                        ? "/path/to/placeholder.jpg"
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
                                                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-purple-600 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                aria-label={`Quick view ${product.name}`}
                                            >
                                                Quick View
                                            </button>
                                        </div>
                                    </a>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold text-gray-900 line-clamp-1">
                                            {product.name}
                                        </h2>
                                        <div className="flex gap-2 items-center">
                                            <div className="flex gap-0.5">
                                                {renderStars(getAverageRating(product.id))}
                                            </div>
                                            <span className="text-gray-500 text-sm">
                                                (
                                                {
                                                    reviews.filter((r) => r.product_id === product.id)
                                                        .length
                                                }{" "}
                                                reviews)
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
                                                        ₦
                                                        {(
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
                                            className={`mt-4 w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${product.is_out_of_stock
                                                    ? "bg-gray-400 cursor-not-allowed text-white"
                                                    : "bg-purple-600 hover:bg-purple-700 text-white"
                                                }`}
                                            aria-label={`Add ${product.name} to cart`}
                                        >
                                            <FaShoppingCart className="w-4 h-4" />
                                            <span>
                                                {product.is_out_of_stock
                                                    ? "Out of Stock"
                                                    : "Add to Cart"}
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            Recently Viewed
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                            {recentlyViewed.map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300"
                                >
                                    <a href={`/product/${product.id}`} className="block">
                                        <img
                                            src={
                                                product.image_url.startsWith("data:image")
                                                    ? "/path/to/placeholder.jpg"
                                                    : product.image_url
                                            }
                                            alt={product.name}
                                            className="w-full h-48 object-cover rounded-lg mb-4"
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            You May Also Like
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {relatedProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300"
                                >
                                    <a href={`/product/${product.id}`} className="block">
                                        <img
                                            src={
                                                product.image_url.startsWith("data:image")
                                                    ? "/path/to/placeholder.jpg"
                                                    : product.image_url
                                            }
                                            alt={product.name}
                                            className="w-full h-48 object-cover rounded-lg mb-4"
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
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        role="dialog"
                        aria-modal="true"
                        tabIndex="-1"
                        ref={modalRef}
                    >
                        <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                {quickViewProduct.name}
                            </h2>
                            <img
                                src={
                                    quickViewProduct.image_url.startsWith("data:image")
                                        ? "/path/to/placeholder.jpg"
                                        : quickViewProduct.image_url
                                }
                                alt={quickViewProduct.name}
                                className="w-full h-64 object-cover rounded-lg mb-4"
                            />
                            <p className="text-gray-600 mb-4">
                                {quickViewProduct.description}
                            </p>
                            <div className="text-xl font-semibold mb-4">
                                {quickViewProduct.discount_percentage > 0 ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 line-through">
                                            ₦{Number(quickViewProduct.price).toLocaleString()}
                                        </span>
                                        <span className="text-green-600">
                                            ₦
                                            {(
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
                            {quickViewProduct.id === "5" && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Color
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            className="w-8 h-8 bg-red-800 rounded-full focus:ring-2 focus:ring-purple-600"
                                            aria-label="Select wine red"
                                        ></button>
                                        <button
                                            className="w-8 h-8 bg-green-800 rounded-full focus:ring-2 focus:ring-purple-600"
                                            aria-label="Select emerald green"
                                        ></button>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() =>
                                    addToCart({
                                        ...quickViewProduct, // Fixed: Changed 'product' to 'quickViewProduct'
                                        quantity: 1,
                                        is_on_sale: quickViewProduct.is_on_sale,
                                        discount_percentage: quickViewProduct.discount_percentage,
                                        is_out_of_stock: quickViewProduct.is_out_of_stock,
                                    })
                                }
                                disabled={quickViewProduct.is_out_of_stock}
                                className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${quickViewProduct.is_out_of_stock
                                        ? "bg-gray-400 cursor-not-allowed text-white"
                                        : "bg-purple-600 hover:bg-purple-700 text-white"
                                    }`}
                                aria-label={`Add ${quickViewProduct.name} to cart`}
                            >
                                <FaShoppingCart className="w-4 h-4" />
                                <span>
                                    {quickViewProduct.is_out_of_stock
                                        ? "Out of Stock"
                                        : "Add to Cart"}
                                </span>
                            </button>
                            <button
                                onClick={closeQuickView}
                                className="mt-2 w-full text-gray-600 hover:text-gray-800"
                                aria-label="Close quick view"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}
