'use client';

import Head from 'next/head';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Policies({ profile }) {
  const router = useRouter();
  const [activePolicy, setActivePolicy] = useState('cookies');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section && policies.some((policy) => policy.id === section)) {
      setActivePolicy(section);
    }
  }, []);

  const policies = [
    {
      id: 'cookies',
      title: 'Cookies Policy',
      content: (
        <div className="space-y-6">
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
            For questions about our Cookies Policy, contact us via our <Link href="/contact" className="text-purple-600 hover:underline">Contact Page</Link> or at support@vianclothinghub.com.ng
          </p>
        </div>
      ),
    },
    {
      id: 'terms-of-service',
      title: 'Terms of Service',
      content: (
        <div className="space-y-6">
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
          <h2 className="text-xl font-semibold text-purple-700">4. Intellectual Property</h2>
          <p>
            All content on our website, including images and designs, is our property or licensed to us. You may not reproduce or distribute without permission.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">5. Limitation of Liability</h2>
          <p>
            We are not liable for any damages arising from your use of our services, including delays in delivery or inaccuracies in product descriptions, to the extent permitted by law.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">6. Contact Us</h2>
          <p>
            For questions about these Terms, contact us via our <Link href="/contact" className="text-purple-600 hover:underline">Contact Page</Link> or at support@vianclothinghub.com.ng
          </p>
        </div>
      ),
    },
    {
      id: 'terms-and-conditions',
      title: 'Terms and Conditions',
      content: (
        <div className="space-y-6">
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
          <h2 className="text-xl font-semibold text-purple-700">4. Product Descriptions</h2>
          <p>
            We strive for accuracy in product descriptions and images. However, slight variations may occur due to lighting or manufacturing differences.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">5. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Nigeria. Disputes will be resolved in Nigerian courts.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">6. Contact Us</h2>
          <p>
            For questions, contact us via our <Link href="/contact" className="text-purple-600 hover:underline">Contact Page</Link> or at support@vianclothinghub.com.ng
          </p>
        </div>
      ),
    },
    {
      id: 'returns',
      title: 'Return Policy',
      content: (
        <div className="space-y-6">
          <p><strong>Last Updated:</strong> July 25, 2025</p>
          <p>
            At Vian Clothing Hub, we want you to be satisfied with your purchase. Our Return Policy outlines the conditions under which you can return or exchange items.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">1. Eligibility for Returns</h2>
          <p>
            Items are eligible for return within 7 days of delivery if they are unused, in original condition, with tags and packaging intact. Custom-made or personalized items are non-returnable unless defective.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">2. Return Process</h2>
          <p>
            To initiate a return, contact us via our <Link href="/contact" className="text-purple-600 hover:underline">Contact Page</Link> or at support@vianclothinghub.com.ng with your order number. We’ll provide a return address and instructions. You are responsible for return shipping costs unless the item is defective.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">3. Inspection and Approval</h2>
          <p>
            Returned items are inspected within 3–5 business days of receipt. If approved, you’ll be notified, and your refund or exchange will be processed.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">4. Exchanges</h2>
          <p>
            Exchanges are subject to availability. If the requested item is unavailable, we’ll issue a refund or store credit at your discretion.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">5. Contact Us</h2>
          <p>
            For questions about returns, contact us via our <Link href="/contact" className="text-purple-600 hover:underline">Contact Page</Link> or at supportinghub.com.
          </p>
        </div>
      ),
    },
    {
      id: 'refunds',
      title: 'Refund Policy',
      content: (
        <div className="space-y-6">
          <p><strong>Last Updated:</strong> July 25, 2025</p>
          <p>
            Vian Clothing Hub is committed to ensuring your satisfaction. Our Refund Policy explains how refunds are processed for eligible returns or order issues.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">1. Refund Eligibility</h2>
          <p>
            Refunds are available for items returned within 7 days of delivery, provided they meet our <Link href="/policies?section=returns" className="text-purple-600 hover:underline">Return Policy</Link> conditions. Refunds are also issued for defective items or incorrect orders.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">2. Refund Process</h2>
          <p>
            After your return is inspected and approved, refunds are processed within 7–14 business days to your original payment method. Cash-on-delivery refunds may be issued via bank transfer.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">3. Non-Refundable Items</h2>
          <p>
            Custom-made, personalized, or discounted items are non-refundable unless defective or incorrect.
          </p>
          <h2 className="text-xl font-semibold text-purple-700">4. Shipping Costs</h2>
          <p>
            Original shipping costs are non-refundable unless the return is due to our error (e.g., defective or incorrect item).
          </p>
          <h2 className="text-xl font-semibold text-purple-700">5. Contact Us</h2>
          <p>
            For questions about refunds, contact us via our <Link href="/contact" className="text-purple-600 hover:underline">Contact Page</Link> or at support@vianclothinghub.com.ng
          </p>
        </div>
      ),
    },
  ];

  const policiesSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Policies - Vian Clothing Hub",
    "description": "Review Vian Clothing Hub's policies, including Cookies, Terms of Service, Terms and Conditions, Returns, and Refunds.",
    "url": "https://yourdomain.com/policies",
    "hasPart": policies.map((policy) => ({
      "@type": "WebPageElement",
      "name": policy.title,
      "text": policy.content.props.children.find((child) => typeof child === 'string' && child.startsWith('Last Updated')) // Extract summary if needed
    })),
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://yourdomain.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Policies"
        }
      ]
    },
    "publisher": {
      "@type": "Organization",
      "name": "Vian Clothing Hub"
    }
  };

  // Add ReturnPolicy specifically for returns/refunds sections
  const returnPolicySchema = {
    "@context": "https://schema.org",
    "@type": "ReturnPolicy",
    "name": "Vian Clothing Hub Return Policy",
    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
    "merchantReturnDays": 7,
    "returnMethod": "https://schema.org/ReturnByMail",
    "applicableCountry": "NG",
    "returnFees": "https://schema.org/ReturnFeesCustomerResponsibility" // Unless defective
  };



  return (
    <>
      <Head>
        <title>Policies - Vian Clothing Hub</title>
        <meta
          name="description"
          content="Review Vian Clothing Hub's policies, including Cookies, Terms of Service, Terms and Conditions, Returns, and Refunds."
        />
        <meta name="keywords" content="policies, cookies, terms of service, terms and conditions, returns, refunds, Vian Clothing Hub" />
        <meta name="author" content="Vian Clothing Hub" />
        <meta property="og:title" content="Policies - Vian Clothing Hub" />
        <meta
          property="og:description"
          content="Understand our policies governing your use of Vian Clothing Hub's website and services."
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(policiesSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(returnPolicySchema) }}
        />
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navbar profile={profile} />
        <section className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-1/4 bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold text-purple-700 mb-4">Policies</h2>
            <ul className="space-y-2">
              {policies.map((policy) => (
                <li key={policy.id}>
                  <button
                    onClick={() => setActivePolicy(policy.id)}
                    className={`w-full text-left py-2 px-4 rounded-lg ${activePolicy === policy.id
                        ? 'bg-purple-100 text-purple-700 font-semibold'
                        : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                      } transition-colors`}
                  >
                    {policy.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          {/* Main Content */}
          <div className="w-full md:w-3/4 bg-white text-gray-700 rounded-lg shadow-md p-6">
            {policies.find((policy) => policy.id === activePolicy)?.content || (
              <p className="text-gray-900">Select a policy to view details.</p>
            )}
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
}