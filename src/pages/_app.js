import "@/styles/globals.css";
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import 'leaflet/dist/leaflet.css';
import CookieConsent from '@/components/cookie-consent';

export default function App({ Component, pageProps }) {
  return (
    <WishlistProvider>
      <CartProvider>
        <Component {...pageProps} />
        <CookieConsent />
      </CartProvider>
    </WishlistProvider>
  );
}