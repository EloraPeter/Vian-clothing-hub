import "../styles/globals.css";
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import 'leaflet/dist/leaflet.css';
import CookieConsent from '@/components/cookie-consent';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch((error) => console.error('Service Worker registration failed:', error));
    }
  }, []);
  return (
    <WishlistProvider>
      <CartProvider>
        <Component {...pageProps} />
        <CookieConsent />
      </CartProvider>
    </WishlistProvider>
  );
}