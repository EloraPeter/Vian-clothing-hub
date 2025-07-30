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
    setCart((prev) => {
      const existing = prev.find(
        (p) =>
          p.id === item.id &&
          (!item.size || p.size === item.size) &&
          (!item.color || p.color === item.color)
      );
      if (existing) {
        return prev.map((p) =>
          p.id === item.id &&
          (!item.size || p.size === item.size) &&
          (!item.color || p.color === item.color)
            ? { ...p, quantity: p.quantity + item.quantity }
            : p
        );
      }
      return [...prev, item];
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