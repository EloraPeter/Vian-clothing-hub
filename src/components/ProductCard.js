import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  return (
    <div className="border p-4 rounded shadow">
      <image src={product.image} alt={product.name} className="w-full h-48 object-cover" />
      <h2 className="text-lg font-semibold mt-2">{product.name}</h2>
      <p className="text-gray-700">₦{product.price}</p>
      <button
        onClick={() => addToCart(product)}
        className="mt-2 bg-purple-700 text-white px-4 py-2 rounded"
      >
        Add to Cart
      </button>
    </div>
  );
}
