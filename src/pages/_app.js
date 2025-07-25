import "@/styles/globals.css";
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import 'leaflet/dist/leaflet.css';


export default function App({ Component, pageProps }) {
  return (
    <WishlistProvider>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </WishlistProvider>
  );
}
