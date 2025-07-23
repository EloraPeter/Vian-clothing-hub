import Link from 'next/link';
import Footer from '@/components/footer';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-rose-50 bg-[url('/african-fabric.jpg')] bg-cover bg-center relative flex items-center justify-center p-6">
      <Link href="/" className="fixed top-6 left-6 z-50 flex items-center space-x-2 hover:shadow-glow transition-shadow duration-300">
        <img src="/logo.svg" alt="Vian Clothing Hub Logo" className="h-20 w-auto" />
      </Link>
      <div className="relative bg-white/90 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center animate-fade-in">
        <div className="absolute inset-0 bg-gray-900/30 rounded-2xl -z-10" />
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-yellow-600 animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C13.1 2 14 2.9 14 4V6H16C17.1 6 18 6.9 18 8V10C18 11.1 17.1 12 16 12H14V14H16C17.1 14 18 14.9 18 16V18C18 19.1 17.1 20 16 20H14V22H10V20H8C6.9 20 6 19.1 6 18V16C6 14.9 6.9 14 8 14H10V12H8C6.9 12 6 11.1 6 10V8C6 6.9 6.9 6 8 6H10V4C10 2.9 10.9 2 12 2Z"
              fill="currentColor"
            />
            <path
              d="M10 6H14V10H16V12H14V14H16V16H14V18H10V16H8V14H10V12H8V10H10V6Z"
              fill="#8B5CF6"
              className="opacity-50"
            />
          </svg>
        </div>
        <h1 className="text-5xl font-extrabold text-purple-800 font-['Playfair_Display'] tracking-wide mb-4">
          Oops! Page Not Found
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          Looks like this outfit is out of stock — or the fabric didn’t stitch right.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
          >
            Back to Homepage
          </Link>
          <Link
            href="/shop"
            className="bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-700 shadow-md hover:shadow-lg transition-all duration-300"
          >
            Explore Shop
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}