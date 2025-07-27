import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Footer from "@/components/footer";
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
import CartPanel from "@/components/CartPanel";
import DressLoader from "@/components/DressLoader";
import Breadcrumbs from "@/components/Breadcrumbs";
import Head from "next/head";
import VariantSelector from "@/components/VariantSelector";

export default function Product() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const { addToCart, cart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [additionalImages, setAdditionalImages] = useState([]);
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [frequentlyBought, setFrequentlyBought] = useState([]);
  const [mainImage, setMainImage] = useState("");
  const [newReview, setNewReview] = useState({ rating: "", comment: "" });
  const [categories, setCategories] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          setProfile(profileData);
        }

        const { data: categoriesData } = await supabase
          .from("categories")
          .select("id, name, slug, parent_id");
        setCategories(categoriesData || []);

        const { data: productData } = await supabase
          .from("products")
          .select("*, categories(id, name, slug, parent_id)")
          .eq("id", id)
          .single();
        setProduct(productData);
        setMainImage(productData?.image_url);

        const { data: imagesData } = await supabase
          .from("product_images")
          .select("image_url")
          .eq("product_id", id);
        setAdditionalImages(imagesData?.map((img) => img.image_url) || []);

        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("rating, comment, created_at")
          .eq("product_id", id);
        setReviews(reviewsData || []);

        const { data: relatedData } = await supabase
          .from("products")
          .select("id, name, image_url, price, is_on_sale, discount_percentage")
          .eq("category_id", productData?.category_id)
          .neq("id", id)
          .limit(4);
        setRelatedProducts(relatedData || []);

        const { data: freqData } = await supabase
          .from("order_items")
          .select("products(id, name, image_url, price, is_on_sale, discount_percentage)")
          .eq("order_id", supabase.from("order_items").select("order_id").eq("product_id", id))
          .neq("product_id", id)
          .limit(4);
        setFrequentlyBought(freqData?.map((item) => item.products) || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }
    const { error } = await supabase.from("reviews").insert({
      product_id: id,
      user_id: user.id,
      rating: parseInt(newReview.rating),
      comment: newReview.comment,
    });
    if (!error) {
      setReviews([
        ...reviews,
        {
          rating: parseInt(newReview.rating),
          comment: newReview.comment,
          created_at: new Date().toISOString(),
        },
      ]);
      setNewReview({ rating: "", comment: "" });
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating)
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      else if (i - 0.5 <= rating)
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      else stars.push(<FaRegStar key={i} className="text-yellow-400" />);
    }
    return stars;
  };

  const handleAddToCart = (variant) => {
    if (!product) return;
    const cartItem = {
      id: variant ? `${product.id}-${variant.variantId}` : product.id,
      product_id: product.id,
      name: product.name,
      price: product.price + (variant?.additionalPrice || 0),
      quantity: 1,
      image_url: product.image_url,
      discount_percentage: product.discount_percentage || 0,
      ...(variant && { size: variant.size, color: variant.color }),
    };
    addToCart(cartItem);
  };

  const getCurrentPrice = () => {
    if (!product) return 0;
    let price = product.price;
    if (selectedVariant) {
      price += selectedVariant.additionalPrice || 0;
    }
    if (product.is_on_sale) {
      price *= (1 - (product.discount_percentage || 0) / 100);
    }
    return price;
  };

  if (loading) return <DressLoader />;

  return (
    <>
      <Head>
        <title>{product?.name} - Vian Clothing Hub</title>
        <meta name="description" content={product?.description} />
      </Head>
      <main className="min-h-screen relative mb-0 bg-gray-100 pb-0">
        <Navbar
          profile={profile}
          onCartClick={() => setIsCartOpen(true)}
          cartItemCount={cart.length}
        />
        <CartPanel isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <Breadcrumbs
            product={product}
            category={product?.categories}
            categories={categories}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Images */}
            <div>
              <img
                src={mainImage}
                alt={product?.name}
                className="w-full h-96 object-cover rounded-lg mb-4"
                loading="lazy"
              />
              <div className="flex gap-2">
                {[product?.image_url, ...additionalImages].map((image, i) => (
                  <img
                    key={i}
                    src={image}
                    alt={`${product?.name} ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                    onClick={() => setMainImage(image)}
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
            {/* Details */}
            <div>
              <h1 className="text-3xl font-bold text-purple-800 font-playfair-display mb-4">
                {product?.name}
              </h1>
              <div className="flex gap-2 mb-4">
                {renderStars(
                  reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0
                )}
              </div>
              <p className="text-purple-700 font-semibold text-xl mb-4">
                {product?.is_on_sale ? (
                  <>
                    <span className="line-through text-red-600">
                      ₦{Number(product.price + (selectedVariant?.additionalPrice || 0)).toLocaleString()}
                    </span>
                    <span className="ml-2 text-green-600">
                      ₦{Number(getCurrentPrice()).toLocaleString()}
                    </span>
                  </>
                ) : (
                  `₦${Number(getCurrentPrice()).toLocaleString()}`
                )}
              </p>
              <p className="text-gray-600 mb-4">{product?.description}</p>
              <VariantSelector
                productId={product?.id}
                onSelectVariant={(variant) => {
                  setSelectedVariant(variant);
                  handleAddToCart(variant);
                }}
                disabled={product?.is_out_of_stock}
              />
              <button
                onClick={() => toggleWishlist(product)}
                className="mt-4 w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                {isInWishlist(product?.id) ? <FaHeart className="text-red-600" /> : <FaRegHeart />}
                {isInWishlist(product?.id) ? "Remove from Wishlist" : "Add to Wishlist"}
              </button>
            </div>
          </div>
          {/* Reviews */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-purple-800 font-playfair-display mb-4">
              Customer Reviews
            </h2>
            {reviews.length === 0 ? (
              <p className="text-gray-600">No reviews yet.</p>
            ) : (
              <ul className="space-y-4">
                {reviews.map((review, i) => (
                  <li key={i} className="border p-4 rounded-lg">
                    <div className="flex gap-2 mb-2">
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-gray-600">{review.comment}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleReviewSubmit} className="mt-6 space-y-4">
              <select
                value={newReview.rating}
                onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-700"
                required
              >
                <option value="">Select Rating</option>
                {[1, 2, 3, 4, 5].map((r) => (
                  <option key={r} value={r}>
                    {r} Stars
                  </option>
                ))}
              </select>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-700"
                placeholder="Write your review"
              />
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Submit Review
              </button>
            </form>
          </section>
          {/* Related Products */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-purple-800 font-playfair-display mb-4">
              Related Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100"
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    loading="lazy"
                  />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product.name}
                  </h3>
                  <p className="text-purple-700 font-semibold">
                    {product.is_on_sale ? (
                      <>
                        <span className="line-through text-red-600">
                          ₦{Number(product.price).toLocaleString()}
                        </span>
                        <span className="ml-2 text-green-600">
                          ₦{(product.price * (1 - product.discount_percentage / 100)).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      `₦${Number(product.price).toLocaleString()}`
                    )}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <Footer />
      </main>
    </>
  );
}