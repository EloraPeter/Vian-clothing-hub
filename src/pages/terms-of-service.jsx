import Head from 'next/head';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';

export default function TermsOfService({ profile }) {
  return (
    <>
      <Head>
        <title>Terms of Service - Vian Clothing Hub</title>
        <meta
          name="description"
          content="Read the Terms of Service for using Vian Clothing Hub's website and services."
        />
        <meta name="keywords" content="terms of service, Vian Clothing Hub, user agreement, website terms" />
        <meta name="author" content="Vian Clothing Hub" />
        <meta property="og:title" content="Terms of Service - Vian Clothing Hub" />
        <meta
          property="og:description"
          content="Understand the terms governing your use of Vian Clothing Hub's website and services."
        />
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navbar profile={profile} />
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8 text-center text-purple-700">
            Terms of Service
          </h1>
          <div className="space-y-6 text-gray-600">
            <p><strong>Last Updated:</strong> July 25, 2025</p>
            <p>
              Welcome to Vian Clothing Hub ("we," "us," or "our"). These Terms of Service ("Terms") govern your use of our website and services. By accessing or using our website, you agree to these Terms.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">1. Use of Our Services</h2>
            <p>
              You may use our services for lawful purposes only. You agree not to misuse our website, including hacking, distributing malware, or violating intellectual property rights.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">2. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Notify us immediately of any unauthorized use.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">3. Orders and Payments</h2>
            <p>
              All orders are subject to availability and acceptance. We reserve the right to refuse or cancel orders at our discretion. Payments are processed securely via trusted providers.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">4. Returns and Refunds</h2>
            <p>
              We offer returns or exchanges within 7 days for unused items with tags. See our <Link href="/faqs" className="text-purple-600 hover:underline">FAQs</Link> for details.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">5. Intellectual Property</h2>
            <p>
              All content on our website, including images and designs, is our property or licensed to us. You may not reproduce or distribute without permission.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">6. Limitation of Liability</h2>
            <p>
              We are not liable for any damages arising from your use of our services, including delays in delivery or inaccuracies in product descriptions, to the extent permitted by law.
            </p>
            <h2 className="text-xl font-semibold text-purple-700">7. Contact Us</h2>
            <p>
              For questions about these Terms, contact us via our <Link href="/contact" className="text-purple-600 hover:underline">Contact Page</Link> or at support@vianclothinghub.com.
            </p>
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
}
