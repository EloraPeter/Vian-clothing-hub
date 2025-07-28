import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar, FaSearch } from "react-icons/fa";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from "@/components/Navbar";
import Footer from '@/components/footer';
import CartPanel from "@/components/CartPanel";
import DressLoader from '@/components/DressLoader';

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [productsPerPage] = useState(30);
    const [sortOption, setSortOption] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const { addToCart, cart } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [categories, setCategories] = useState([]);
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
                    .maybeSingle();
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
            const { data, error } = await supabase
                .from('products')
                .select('*, product_images(image_url)')
                .ilike('name', `%${searchQuery}%`);
            if (error) console.error("Error fetching products:", error.message);
            else setProducts(data);
            setLoading(false);
        }
        fetchProducts();
    }, [searchQuery]);

    // Fetch categories
    useEffect(() => {
        async function fetchCategories() {
            const { data: categoriesData, error } = await supabase
                .from('categories')
                .select('id, name, slug, parent_id')
                .order('parent_id, name');
            if (error) console.error("Error fetching categories:", error.message);
            else setCategories(categoriesData);
        }
        fetchCategories();
    }, []);

    // Fetch related products
    useEffect(() => {
        async function fetchRelatedProducts() {
            const { data, error } = await supabase
                .from('products')
                .select('*, product_images(image_url)')
                .eq('category_id', selectedCategory)
                .limit(4);
            if (error) console.error("Error fetching related products:", error.message);
            else setRelatedProducts(data);
        }
        if (selectedCategory) fetchRelatedProducts();
    }, [selectedCategory]);

    // Memoized renderStars function
    const renderStars = useCallback((rating) => {
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
    }, []);

    // Filter and sort products
    const displayedProducts = useMemo(() => {
        let result = [...products];
        if (selectedCategory) {
            result = result.filter((p) => p.category_id === selectedCategory);
        }
        if (sortOption === "price-asc") {
            result.sort((a, b) => a.price - b.price);
        } else if (sortOption === "price-desc") {
            result.sort((a, b) => b.price - a.price);
        } else if (sortOption === "newest") {
            result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortOption === "rating") {
            result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        }
        return result;
    }, [products, selectedCategory, sortOption]);

    // Pagination
    const totalPages = Math.ceil(displayedProducts.length / productsPerPage);
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = displayedProducts.slice(indexOfFirstProduct, indexOfLastProduct);

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
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loading, currentPage, totalPages]);

    // Reset page if out of bounds
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
    }, [totalPages, currentPage]);

    // Handle search
    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    }, []);

    // Handle wishlist toggle with toast
    const handleToggleWishlist = useCallback((product) => {
        toggleWishlist(product);
        toast.success(`${product.name} ${isInWishlist(product.id) ? 'removed from' : 'added to'} wishlist!`, {
            position: "top-right",
            autoClose: 2000,
        });
    }, [toggleWishlist, isInWishlist]);

    // Quick view handlers
    const openQuickView = useCallback((product) => setQuickViewProduct(product), []);
    const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

    if (loading) return <DressLoader />;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <ToastContainer />
            <Navbar
                profile={profile}
                onCartClick={() => setIsCartOpen(true)}
                cartItemCount={cart.length}
            />
            <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-4xl font-bold text-center mb-12 text-purple-800">
                    Ready-to-Wear Collection
                    <span className="block mt-3 h-1 w-24 bg-purple-600 mx-auto"></span>
                </h1>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-xl mx-auto">
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full p-3 pl-10 text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            aria-label="Search products"
                        />
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="p-2 text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            aria-label="Select product category"
                        >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
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
                    </div>
                    {(isFilterOpen || isMobileFilterOpen) && (
                        <div className="mt-4 bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="text-lg font-semibold mb-4">Filters</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Price Range</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100000"
                                        className="w-full"
                                        aria-label="Filter by price range"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Rating</label>
                                    <select
                                        className="p-2 border border-gray-200 rounded-lg w-full"
                                        aria-label="Filter by rating"
                                    >
                                        <option value="">All Ratings</option>
                                        <option value="4">4+ Stars</option>
                                        <option value="3">3+ Stars</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                className="mt-4 p-2 bg-purple-600 text-white rounded-lg"
                                onClick={() => {
                                    setIsFilterOpen(false);
                                    setIsMobileFilterOpen(false);
                                }}
                                aria-label="Apply filters"
                            >
                                Apply Filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentProducts.length > 0 ? (
                        currentProducts.map((product) => (
                            <div
                                key={product.id}
                                className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300 relative group"
                                role="article"
                                aria-label={`Product: ${product.name}`}
                            >
                                <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                                    {product.is_on_sale && (
                                        <span className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
                                            Sale
                                        </span>
                                    )}
                                    {product.is_out_of_stock && (
                                        <span className="bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
                                            Out of Stock
                                        </span>
                                    )}
                                    {product.is_new && (
                                        <span className="bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
                                            New
                                        </span>
                                    )}
                                    {product.stock < 5 && product.stock > 0 && (
                                        <span className="bg-yellow-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm">
                                            Only {product.stock} left!
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleToggleWishlist(product)}
                                    className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-full hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                                    aria-label={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
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
                                            src={product.image_url}
                                            srcSet={`${product.image_url}?w=300 300w, ${product.image_url}?w=600 600w`}
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
                                    <h2 className="text-2xl font-bold text-gray-900 line-clamp-1">{product.name}</h2>
                                    <div className="flex gap-2 items-center">
                                        <div className="flex gap-0.5">{renderStars(product.rating || 0)}</div>
                                        <span className="text-gray-500 text-sm">({product.review_count || 0} reviews)</span>
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
                                                    ₦{(product.price * (1 - product.discount_percentage / 100)).toLocaleString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-purple-700">
                                                ₦{Number(product.price).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => addToCart({
                                            ...product,
                                            quantity: 1,
                                            is_on_sale: product.is_on_sale,
                                            discount_percentage: product.discount_percentage,
                                            is_out_of_stock: product.is_out_of_stock,
                                        })}
                                        disabled={product.is_out_of_stock}
                                        className={`mt-4 w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${
                                            product.is_out_of_stock
                                                ? 'bg-gray-400 cursor-not-allowed text-white'
                                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                                        }`}
                                        aria-label={`Add ${product.name} to cart`}
                                    >
                                        <FaShoppingCart className="w-4 h-4" />
                                        <span>{product.is_out_of_stock ? 'Out of Stock' : 'Add to Cart'}</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-600 col-span-full">No products available.</p>
                    )}
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
                        <span className="text-gray-600" aria-live="polite">Page {currentPage} of {totalPages}</span>
                        <button
                            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            aria-label="Next page"
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">You May Also Like</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {relatedProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-purple-300"
                                >
                                    <a href={`/product/${product.id}`} className="block">
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-48 object-cover rounded-lg mb-4"
                                            loading="lazy"
                                        />
                                    </a>
                                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                                    <div className="text-purple-700 font-semibold">
                                        ₦{Number(product.price).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick View Modal */}
            {quickViewProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
                    <div className="bg-white p-6 rounded-lg max-w-lg w-full">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{quickViewProduct.name}</h2>
                        <img
                            src={quickViewProduct.image_url}
                            alt={quickViewProduct.name}
                            className="w-full h-64 object-cover rounded-lg mb-4"
                        />
                        <p className="text-gray-600 mb-4">{quickViewProduct.description}</p>
                        <div className="text-xl font-semibold mb-4">
                            {quickViewProduct.discount_percentage > 0 ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 line-through">
                                        ₦{Number(quickViewProduct.price).toLocaleString()}
                                    </span>
                                    <span className="text-green-600">
                                        ₦{(quickViewProduct.price * (1 - quickViewProduct.discount_percentage / 100)).toLocaleString()}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-purple-700">
                                    ₦{Number(quickViewProduct.price).toLocaleString()}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => addToCart({
                                ...quickViewProduct,
                                quantity: 1,
                                is_on_sale: quickViewProduct.is_on_sale,
                                discount_percentage: quickViewProduct.discount_percentage,
                                is_out_of_stock: quickViewProduct.is_out_of_stock,
                            })}
                            disabled={quickViewProduct.is_out_of_stock}
                            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${
                                quickViewProduct.is_out_of_stock
                                    ? 'bg-gray-400 cursor-not-allowed text-white'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }`}
                            aria-label={`Add ${quickViewProduct.name} to cart`}
                        >
                            <FaShoppingCart className="w-4 h-4" />
                            <span>{quickViewProduct.is_out_of_stock ? 'Out of Stock' : 'Add to Cart'}</span>
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

            <Footer />
        </div>
    );
}