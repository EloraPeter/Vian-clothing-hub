import Head from 'next/head';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';

export default function CookiesPolicy({ profile }) {
  return (
    <>
      <Head>
        <title>Cookies Policy - Vian Clothing Hub</title>
        <meta
          name="description"
          content="Learn about how Vian Clothing Hub uses cookies to improve your shopping experience."
        />
        <meta name="keywords" content="cookies policy, Vian Clothing Hub, privacy, website cookies" />
        <meta name="author" content="Vian Clothing Hub" />
        <meta property="og:title" content="Cookies Policy - Vian Clothing Hub" />
        <meta
          property="og:description"
          content="Understand our cookies policy and how we use cookies to enhance your experience."
        />
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navbar profile={profile} />
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8 text-center text-purple-700">
            Cookies Policy
          </h1>
          <div className="space-y-6 text-gray-600">
            <p><strong>Last Updated:</strong> July 25, 2025</p>
            <p>
              Vian Clothing Hub ("we," "us," or "our") uses cookies and similar technologies to enhance your experience on our website. This Cookies Policy explains what cookies are, how we use them, and how you can manage your cookie preferences.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit our website. They help us remember your preferences, improve site functionality, and provide personalized content.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">How We Use Cookies</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Essential Cookies:</strong> Necessary for the website to function, such as maintaining your session during checkout.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site, allowing us to improve performance.</li>
              <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements and track campaign effectiveness.</li>
              <li><strong>Preference Cookies:</strong> Store your preferences, such as language or currency settings.</li>
            </ul>
            <h2 className="text-xl font-semibold text-purple-700">Managing Cookies</h2>
            <p>
              You can manage cookies through our cookie consent popup or your browser settings. Note that disabling essential cookies may affect site functionality.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">Third-Party Cookies</h2>
            <p>
              We may use third-party services (e.g., Google Analytics, Paystack) that set cookies. These are subject to their respective privacy policies.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">Contact Us</h2>
            <p>
              For questions about our Cookies Policy, contact us via our <Link href="/contact" className="text-purple-600 hover:underline">Contact Page</Link> or at support@vianclothinghub.com.
            </p>
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
}
