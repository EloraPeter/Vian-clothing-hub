import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    FaHeart,
    FaRegHeart,
    FaShoppingCart,
    FaStar,
    FaStarHalfAlt,
    FaRegStar,
} from "react-icons/fa";

export default function VariantSelector({ productId, onSelectVariant, disabled }) {
  const [variants, setVariants] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [error, setError] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);

  useEffect(() => {
    async function fetchVariants() {
      try {
        const { data, error } = await supabase
          .from('product_variants')
          .select('id, size, color, stock_quantity, additional_price')
          .eq('product_id', productId);
        if (error) throw error;
        setVariants(data || []);
      } catch (err) {
        setError('Failed to load variants: ' + err.message);
      }
    }
    fetchVariants();
  }, [productId]);

  // Update available colors when size changes
  useEffect(() => {
    const colors = [...new Set(
      variants
        .filter(v => v.size === selectedSize && v.stock_quantity > 0)
        .map(v => v.color)
    )];
    setAvailableColors(colors);
    if (!colors.includes(selectedColor)) {
      setSelectedColor(colors[0] || '');
    }
  }, [selectedSize, variants]);

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      setError('Please select a size and color.');
      return;
    }
    const variant = variants.find(
      v => v.size === selectedSize && v.color === selectedColor
    );
    if (!variant || variant.stock_quantity <= 0) {
      setError('Selected variant is out of stock.');
      return;
    }
    setError(null);
    onSelectVariant({
      variantId: variant.id,
      size: selectedSize,
      color: selectedColor,
      additionalPrice: variant.additional_price,
      stockQuantity: variant.stock_quantity,
    });
  };

  const sizes = [...new Set(variants.map(v => v.size))].filter(Boolean);
  const hasVariants = variants.length > 0;

  if (!hasVariants) {
    return (
      <button
        onClick={() => onSelectVariant(null)}
        disabled={disabled}
        className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${
          disabled
            ? 'bg-gray-400 cursor-not-allowed text-white'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        <FaShoppingCart />
        {disabled ? 'Out of Stock' : 'Add to Cart'}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {sizes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Size
          </label>
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Select size"
          >
            <option value="">Select a size</option>
            {sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
      {availableColors.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Color
          </label>
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Select color"
            disabled={!selectedSize}
          >
            <option value="">Select a color</option>
            {availableColors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          {selectedSize && selectedColor && (
            <p className="text-sm text-gray-500 mt-1">
              {variants.find(v => v.size === selectedSize && v.color === selectedColor)?.stock_quantity || 0} in stock
            </p>
          )}
        </div>
      )}
      <button
        onClick={handleAddToCart}
        disabled={disabled || !selectedSize || !selectedColor}
        className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${
          disabled || !selectedSize || !selectedColor
            ? 'bg-gray-400 cursor-not-allowed text-white'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
      >
        <FaShoppingCart />
        Add to Cart
      </button>
    </div>
  );
}