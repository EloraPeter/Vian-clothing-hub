import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function FAQs({ profile }) {
  const [openFAQ, setOpenFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqs = [
    {
      question: "What is Vian Clothing Hub?",
      answer:
        "Vian Clothing Hub is your go-to destination for quality, affordable, and stylish fashion pieces curated with love for everyday wear, events, and everything in between.",
    },
    {
      question: "How do I place an order?",
      answer:
        "Browse through our collection, select your desired item(s), add to cart, and proceed to checkout. Follow the payment instructions to complete your order.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept payment on delivery (in select cities), debit/credit cards, bank transfers, and USSD. All payments are securely processed.",
    },
    {
      question: "Can I return or exchange an item?",
      answer:
        "Yes! We offer returns or exchanges within 7 days of delivery, provided the item is unused, unwashed, and still has tags. T&Cs apply. Read our return policy for more details.",
    },
    {
      question: "How long does delivery take?",
      answer:
        "Delivery typically takes 1–3 working days within Delta State and 3–7 working days nationwide. You'll receive tracking details once your order is shipped.",
    },
    {
      question: "Do you deliver outside Nigeria?",
      answer:
        "Not yet. For now, we only deliver within Nigeria. International shipping will be available soon—stay tuned!",
    },
    {
      question: "How can I contact customer service?",
      answer:
        "You can reach us via WhatsApp, Instagram DM, or through our contact form on the website. We're available Mon–Sat, 9AM to 6PM.",
    },
    {
      question: "Can I order custom outfits?",
      answer:
        "Absolutely. Custom/bespoke orders are available. Chat with our style consultant to begin.",
    },
    {
      question: "Do you offer group/corporate discounts?",
      answer:
        "Yes! Whether it’s for weddings, events, or team wear — we offer discounts on bulk orders.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar profile={profile} />
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8 text-center text-purple-700">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-300 rounded-xl p-5 shadow-sm bg-white"
              role="article"
              aria-label={`FAQ: ${faq.question}`}
            >
              <button
                className="flex justify-between items-center w-full text-left"
                onClick={() => toggleFAQ(index)}
                aria-expanded={openFAQ === index}
                aria-controls={`faq-answer-${index}`}
              >
                <h3 className="font-semibold text-lg text-purple-700">
                  {index + 1}. {faq.question}
                </h3>
                {openFAQ === index ? (
                  <FaChevronUp className="w-5 h-5 text-purple-700" />
                ) : (
                  <FaChevronDown className="w-5 h-5 text-purple-700" />
                )}
              </button>
              {openFAQ === index && (
                <div id={`faq-answer-${index}`} className="mt-2 text-gray-600">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}