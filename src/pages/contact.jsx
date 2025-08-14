import { useState } from "react";
import Head from "next/head";
import Link from 'next/link';
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";
import { supabase } from "@/lib/supabaseClient";
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaClock, FaInstagram, FaWhatsapp, FaFacebook } from "react-icons/fa";
import DressLoader from "@/components/DressLoader";

export default function Contact({ profile }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.from("contact_inquiries").insert({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      setMessage("Your message has been sent successfully!");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setMessage("Error sending message. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Us - Vian Clothing Hub",
    "description": "Get in touch with Vian Clothing Hub for inquiries about orders, returns, custom designs, or general support. We're here to help with your fashion needs in Nigeria.",
    "url": "https://vianclothinghub.com.ng/contact",
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://vianclothinghub.com.ng/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Contact Us"
        }
      ]
    },
    "publisher": {
      "@type": "Organization",
      "name": "Vian Clothing Hub",
      "logo": {
        "@type": "ImageObject",
        "url": "https://vianclothinghub.com.ng/logo.svg"
      },
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "telephone": "+234-123-456-7890",
          "contactType": "Customer Service",
          "areaServed": "NG",
          "availableLanguage": "English"
        },
        {
          "@type": "ContactPoint",
          "email": "support@vianclothinghub.com.ng",
          "contactType": "Customer Service"
        }
      ],
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "123 Fashion Street",
        "addressLocality": "Lagos",
        "addressRegion": "Lagos State",
        "postalCode": "100001",
        "addressCountry": "NG"
      }
    },
    "datePublished": "2025-08-14"
  };

  return (
    <>
      <Head>
        <title>Contact Us - Vian Clothing Hub</title>
        <meta
          name="description"
          content="Get in touch with Vian Clothing Hub for inquiries about orders, returns, custom designs, or general support. We're here to help with your fashion needs in Nigeria."
        />
        <meta name="keywords" content="Contact Vian Clothing Hub, Fashion Support Nigeria, African Fashion Inquiries, Customer Service" />
        <meta name="author" content="Vian Clothing Hub" />
        <meta property="og:title" content="Contact Us - Vian Clothing Hub" />
        <meta
          property="og:description"
          content="Reach out to our team for assistance with your shopping experience at Vian Clothing Hub."
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
        />
      </Head>
      <div className="min-h-screen bg-gray-100">
        <Navbar profile={profile} />
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-purple-800 font-playfair-display text-center mb-8">
            Contact Us
          </h1>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
            Have questions about our collections, orders, or custom designs? Our team is here to assist you. Reach out via the form below or use our contact details.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-purple-700 mb-6">Send Us a Message</h2>
              {isSubmitted ? (
                <p className="text-green-600 text-center font-semibold">{message}</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="Enter your full name"
                      required
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="Enter your email"
                      required
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      placeholder="e.g., Order Inquiry"
                      required
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      rows="5"
                      placeholder="Tell us how we can help"
                      required
                      aria-required="true"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                    aria-label="Submit contact form"
                  >
                    {loading ? <DressLoader /> : "Send Message"}
                  </button>
                  {message && <p className="text-red-600 text-sm mt-2">{message}</p>}
                </form>
              )}
            </div>
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-purple-700 mb-6">Our Contact Details</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <FaMapMarkerAlt className="text-purple-600 text-xl" />
                    <p className="text-gray-700">123 Fashion Street, Lagos, Nigeria</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaPhone className="text-purple-600 text-xl" />
                    <p className="text-gray-700">+234 123 456 7890</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaEnvelope className="text-purple-600 text-xl" />
                    <p className="text-gray-700">support@vianclothinghub.com.ng</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaClock className="text-purple-600 text-xl" />
                    <p className="text-gray-700">Mon - Sat: 9AM - 6PM (GMT+1)</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-purple-700 mb-6">Connect on Social Media</h2>
                <div className="flex gap-4 justify-center md:justify-start">
                  <a href="https://instagram.com/vianclothinghub" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 text-3xl" aria-label="Instagram">
                    <FaInstagram />
                  </a>
                  <a href="https://wa.me/2341234567890" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 text-3xl" aria-label="WhatsApp">
                    <FaWhatsapp />
                  </a>
                  <a href="https://facebook.com/vianclothinghub" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 text-3xl" aria-label="Facebook">
                    <FaFacebook />
                  </a>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
                <h2 className="text-2xl font-semibold text-purple-700 mb-6">Our Location</h2>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.0000000000005!2d3.379205614770957!3d6.524379295283!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8b2ae682f50b%3A0x9d4e0b26b3cc4b1d!2sLagos%2C%20Nigeria!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus"
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  title="Vian Clothing Hub Location"
                  className="rounded-lg"
                ></iframe>
              </div>
              <div className="text-center">
                <Link href="/faqs" className="text-purple-600 hover:underline font-semibold">
                  Visit our FAQs for quick answers
                </Link>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
}