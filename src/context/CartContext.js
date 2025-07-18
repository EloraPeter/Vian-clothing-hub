import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
const totalPrice = cart.reduce((acc, item) => acc + item.quantity * item.price, 0);


  useEffect(() => {
    const saved = localStorage.getItem("aunty-cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("aunty-cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, quantity) => {
  if (quantity < 1) {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  } else {
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }
};


  const removeFromCart = (productId) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((p) =>
          p.id === productId ? { ...p, quantity: p.quantity - 1 } : p
        );
      }
      return prev.filter((p) => p.id !== productId);
    });
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};