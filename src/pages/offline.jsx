import Link from 'next/link';
import Head from 'next/head';

export default function Offline() {
  return (
    <>
      <Head>
        <title>Offline - Vian Clothing Hub</title>
        <meta name="description" content="You are currently offline. Please check your internet connection and try again." />
        <meta name="keywords" content="offline, Vian Clothing Hub, no internet" />
        <meta name="author" content="Vian Clothing Hub" />
        <meta property="og:title" content="Offline - Vian Clothing Hub" />
        <meta property="og:description" content="You are currently offline. Please check your internet connection and try again." />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-rose-50 bg-[url('/african-fabric.jpg')] bg-cover bg-center relative p-6">
        <Link href="/" className="fixed top-6 left-6 z-50 flex items-center space-x-2 hover:shadow-glow transition-shadow duration-300">
          <img src="/logo.svg" alt="Vian Clothing Hub Logo" className="h-20 w-auto" />
        </Link>
        <div className="flex items-center justify-center min-h-screen">
          <div className="relative pl-10 max-w-lg w-full text-left animate-fade-in">
            <div className="mb-6">
              <svg
                className="w-24 h-24 mx-auto text-yellow-600 animate-pulse"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h1 className="text-6xl md:text-8xl font-extrabold text-purple-800 font-['Playfair_Display'] tracking-wide mb-4">
              You're Offline
            </h1>
            <p className="text-lg md:text-2xl text-white leading-relaxed mb-6">
              It seems you've lost your internet connection. Please reconnect and try again.
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
        </div>
      </main>
    </>
  );
}
