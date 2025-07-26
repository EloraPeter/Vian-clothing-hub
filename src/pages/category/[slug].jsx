import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Footer from '@/components/footer';
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { FaHeart, FaRegHeart, FaShoppingCart, FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import Navbar from "@/components/Navbar";
import CartPanel from "@/components/CartPanel";
import Breadcrumbs from '@/components/Breadcrumbs';
import DressLoader from '@/components/DressLoader';
import { colorMap } from '@/lib/colorMap';

export default function Category() {
  const router = useRouter();
  const { slug } = router.query;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const { addToCart, cart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [variantsData, setVariantsData] = useState([]); // Store variants for filtering
  const [filters, setFilters] = useState({ size: '', color: '', price: '' });
  const [filterOptions, setFilterOptions] = useState({ sizes: [], colors: [], priceRanges: [] });
  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  const getDescendantCategoryIds = (categoryId, allCategories) => {
    const descendants = [categoryId];
    const children = allCategories.filter((cat) => cat.parent_id === categoryId);
    children.forEach((child) => {
      descendants.push(...getDescendantCategoryIds(child.id, allCategories));
    });
    return descendants;
  };

  useEffect(() => {
    if (!slug) return;

    async function fetchData() {
      setLoading(true);
      try {
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

        // Check cache for filter options
        const cached = localStorage.getItem(`filters_${slug}`);
        if (cached) {
          const { sizes, colors, priceRanges, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 3600000) { // 1 hour TTL
            setFilterOptions({ sizes, colors, priceRanges });
          }
        }

        // Fetch categories
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name, slug, parent_id');
        setCategories(categoriesData || []);

        // Fetch category
        const { data: categoryData } = await supabase
          .from('categories')
          .select('id, name, slug, parent_id')
          .eq('slug', slug)
          .single();
        if (!categoryData) throw new Error('Category not found');
        setCategory(categoryData);

        // Fetch products
        const descendantIds = getDescendantCategoryIds(categoryData.id, categoriesData || []);
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, image_url, price, is_on_sale, discount_percentage, is_out_of_stock, category_id')
          .in('category_id', descendantIds);
        
        // Fetch filter options from product_variants
        const { data: variantsData } = await supabase
          .from('product_variants')
          .select('size, color')
          .in('product_id', productsData.map(p => p.id));
        
        const sizes = [...new Set(variantsData.map(v => v.size))].filter(Boolean);
        const colors = [...new Set(variantsData.map(v => v.color))].filter(Boolean);
        const prices = productsData.map(p => p.price);
        const priceRanges = prices.length > 0 ? [
          { label: 'All Prices', value: '' },
          { label: '₦0 - ₦5,000', value: '0-5000' },
          { label: '₦5,001 - ₦10,000', value: '5001-10000' },
          { label: '₦10,001 - ₦20,000', value: '10001-20000' },
          { label: '₦20,001+', value: '20001-' },
        ] : [];

        setProducts(productsData || []);
        setVariantsData(variantsData || []);
        setFilterOptions({ sizes, colors, priceRanges });

        // Cache filter options
        localStorage.setItem(`filters_${slug}`, JSON.stringify({
          sizes, colors, priceRanges, timestamp: Date.now()
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (filters.size || filters.color) {
      result = result.filter(p => {
        const variants = variantsData.filter(v => v.product_id === p.id);
        return (!filters.size || variants.some(v => v.size === filters.size)) &&
               (!filters.color || variants.some(v => v.color === filters.color));
      });
    }
    if (filters.price) {
      const [min, max] = filters.price.split('-').map(Number);
      result = result.filter(p => max ? p.price >= min && p.price <= max : p.price >= min);
    }
    return result;
  }, [products, filters, variantsData]);

  if (loading) return <DressLoader />;
  if (error) return <p className="p-6 text-center text-red-600">Error: {error}</p>;

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
          cartItemCount={cart.length}
        />
        <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

        <div className="max-w-7xl mx-auto px-4 py-12">
          <Breadcrumbs category={category} categories={categories} />
          <h1 className="text-3xl font-bold text-purple-800 font-playfair-display mb-6">
            {category?.name}
          </h1>
          {/* Filters */}
          <div className="mb-6 bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-purple-800 mb-4">Filter Products</h2>
            <div className="flex flex-wrap gap-4">
              {filterOptions.sizes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <select
                    value={filters.size}
                    onChange={(e) => handleFilterChange('size', e.target.value)}
                    className="px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="Filter by size"
                  >
                    <option value="">All Sizes</option>
                    {filterOptions.sizes.map(size => (
                      <option key={size} value={size}>
                        {size} ({variantsData.filter(v => v.size === size).length})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {filterOptions.colors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleFilterChange('color', '')}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        filters.color === '' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      aria-label="Clear color filter"
                    >
                      All Colors
                    </button>
                    {filterOptions.colors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleFilterChange('color', color)}
                        className={`w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          filters.color === color ? 'border-purple-500' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: colorMap[color] || '#000000' }}
                        aria-label={`Filter by color ${color}`}
                        title={`${color} (${variantsData.filter(v => v.color === color).length})`}
                      >
                        <span className="sr-only">{color}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {filterOptions.priceRanges.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                  <select
                    value={filters.price}
                    onChange={(e) => handleFilterChange('price', e.target.value)}
                    className="px-3 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="Filter by price range"
                  >
                    {filterOptions.priceRanges.map(range => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={() => setFilters({ size: '', color: '', price: '' })}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Reset Filters
              </button>
            </div>
          </div>
          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.length === 0 ? (
              <p className="text-gray-600 col-span-full text-center">No products found.</p>
            ) : (
              filteredProducts.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    loading="lazy"
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
                </Link>
              ))
            )}
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
}