import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce(
    (acc, item) =>
      acc +
      item.quantity *
      (item.discount_percentage > 0
        ? item.price * (1 - item.discount_percentage / 100)
        : item.price),
    0
  );

  useEffect(() => {
    const saved = localStorage.getItem("aunty-cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("aunty-cart", JSON.stringify(cart));
  }, [cart]);

const addToCart = (item) => {
  // Check if item has valid id and product_id
  if (!item.id || (typeof item.id !== 'string' && typeof item.id !== 'number')) {
    console.error('Cannot add item to cart: id must be a string or number', item);
    return;
  }
  if (!item.product_id) {
    console.error('Cannot add item to cart: product_id is required', item);
    return;
  }

  // Create a cart item with consistent structure
  const cartItem = {
    id: `${String(item.product_id)}-${item.size || ''}-${item.color || ''}`, // e.g., "12345-large-blue"
    product_id: String(item.product_id), // Ensure product_id is a string
    name: item.name || 'Unknown Product',
    price: Number(item.price) || 0,
    quantity: Math.max(1, Number(item.quantity) || 1),
    size: item.size || null,
    color: item.color || null,
    image_url: item.image_url || '',
    discount_percentage: Number(item.discount_percentage) || 0,
  };

  setCart((prev) => {
    const existing = prev.find(
      (p) =>
        p.id === cartItem.id &&
        (!cartItem.size || p.size === cartItem.size) &&
        (!cartItem.color || p.color === cartItem.color)
    );
    if (existing) {
      return prev.map((p) =>
        p.id === cartItem.id &&
        (!cartItem.size || p.size === cartItem.size) &&
        (!cartItem.color || p.color === cartItem.color)
          ? { ...p, quantity: p.quantity + cartItem.quantity }
          : p
      );
    }
    return [...prev, cartItem];
  });
};

  const updateQuantity = (productId, size, color, quantity) => {
    if (quantity < 1) {
      setCart((prev) =>
        prev.filter(
          (item) =>
            item.id !== productId ||
            (size && item.size !== size) ||
            (color && item.color !== color)
        )
      );
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.id === productId &&
          (!size || item.size === size) &&
          (!color || item.color === color)
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const removeFromCart = (productId, size, color) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          item.id !== productId ||
          (size && item.size !== size) ||
          (color && item.color !== color)
      )
    );
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, updateQuantity, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
};