import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from '@/context/CartContext'; // we'll build this
import { useWishlist } from '@/context/WishlistContext'; // also build this
import { FaHeart, FaRegHeart, FaShoppingCart } from 'react-icons/fa';
import Navbar from '@/components/Navbar';


const { addToCart } = useCart();
const { toggleWishlist, isInWishlist } = useWishlist();


export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase.from('products').select('*');
      if (error) console.error('Error fetching products:', error.message);
      else setProducts(data);
    }

    fetchProducts();
  }, []);

  return (

    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <Navbar />
      <h1 className="text-3xl font-bold text-center mb-8 text-purple-600">
        Ready-to-Wear Collection
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {products.map((product) => (
          <div key={product.id} className="bg-white p-4 rounded-xl shadow-md relative">
            <button
              onClick={() => toggleWishlist(product)}
              className="absolute top-2 right-2 text-red-500"
            >
              {isInWishlist(product.id) ? <FaHeart /> : <FaRegHeart />}
            </button>

            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-60 object-cover rounded-md mb-4"
            />
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-gray-600 text-sm">{product.description}</p>
            <p className="mt-2 text-purple-700 font-bold">
              ₦{Number(product.price).toLocaleString()}
            </p>
            <button
              onClick={() => addToCart(product)}
              className="mt-3 w-full bg-purple-600 text-white py-2 rounded flex items-center justify-center gap-2"
            >
              <FaShoppingCart /> Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
