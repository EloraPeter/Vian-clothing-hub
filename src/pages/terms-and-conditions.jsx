import Head from 'next/head';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';

export default function TermsAndConditions({ profile }) {
  return (
    <>
      <Head>
        <title>Terms and Conditions - Vian Clothing Hub</title>
        <meta
          name="description"
          content="Review the Terms and Conditions for shopping with Vian Clothing Hub, including policies on orders, delivery, and returns."
        />
        <meta name="keywords" content="terms and conditions, Vian Clothing Hub, shopping policies, e-commerce terms" />
        <meta name="author" content="Vian Clothing Hub" />
        <meta property="og:title" content="Terms and Conditions - Vian Clothing Hub" />
        <meta
          property="og:description"
          content="Understand the terms and conditions for purchasing from Vian Clothing Hub."
        />
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navbar profile={profile} />
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8 text-center text-purple-700">
            Terms and Conditions
          </h1>
          <div className="space-y-6 text-gray-600">
            <p><strong>Last Updated:</strong> July 25, 2025</p>
            <p>
              These Terms and Conditions ("Terms") govern your purchase and use of products and services from Vian Clothing Hub ("we," "us," or "our"). By placing an order, you agree to these Terms.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">1. Ordering Process</h2>
            <p>
              Orders are subject to availability. We may cancel or refuse orders due to stock issues, pricing errors, or suspected fraud. You will be notified if this occurs.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">2. Pricing and Payment</h2>
            <p>
              Prices are in NGN and include applicable taxes. We accept payments via card, bank transfer, USSD, or cash on delivery (select locations). Payment must be completed before dispatch.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">3. Delivery</h2>
            <p>
              Delivery times are 1–3 days within Delta State and 3–7 days nationwide. Delays may occur due to unforeseen circumstances. Tracking details will be provided.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">4. Returns and Refunds</h2>
            <p>
              Returns are accepted within 7 days for unused items with tags. Refunds are processed within 7–14 days after inspection. Custom orders may have different policies.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">5. Product Descriptions</h2>
            <p>
              We strive for accuracy in product descriptions and images. However, slight variations may occur due to lighting or manufacturing differences.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">6. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Nigeria. Disputes will be resolved in Nigerian courts.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">7. Contact Us</h2>
            <p>
              For questions, contact us via our <Link href="/contact" className="text-purple-600 hover:underline">Contact Page</Link> or at support@vianclothinghub.com.
            </p>
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
}
