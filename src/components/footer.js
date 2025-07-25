import Link from 'next/link';

const Footer = () => {
    const handleSubscribe = (e) => {
        e.preventDefault();
        // Add your subscription logic here (e.g., API call to handle email submission)
        alert('Subscription feature is not implemented yet. Please check back later!');
    };

    return (
        <footer className="bg-purple-900 pt-4 px-10 mb-0">
            <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-4">
                <div>
                    <h4 className="font-bold text-lg mb-3 text-purple-100">About Vian</h4>
                    <p className="text-gray-300">
                        Vian Clothing Hub is Nigeria’s go-to destination for trendy, quality, and affordable fashion for men, women, and kids. We’re all about confidence, culture, and class.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold text-lg mb-3 text-purple-100">Quick Links</h4>
                    <ul className="space-y-2">
                        <li><Link href="/shop" className="text-gray-300 hover:text-gold-300">Shop All</Link></li>
                        <li><Link href="/custom-order" className="text-gray-300 hover:text-gold-300">Custom Orders</Link></li>
                        <li><Link href="/returns" className="text-gray-300 hover:text-gold-300">Returns & Refunds</Link></li>
                        <li><Link href="/faqs" className="text-gray-300 hover:text-gold-300">FAQs</Link></li>
                        <li><Link href="/cookies-policy" className="text-purple-600 hover:underline">Cookies Policy</Link></li>
                        <li><Link href="/terms-of-service" className="text-purple-600 hover:underline">Terms of Service</Link></li>
                        <li><Link href="/terms-and-conditions" className="text-purple-600 hover:underline">Terms and Conditions</Link></li>

                    </ul>
                </div>

                <div>
                    <h4 className="font-bold text-lg mb-3 text-purple-100">Contact</h4>
                    <p className="text-gray-300">WhatsApp: <a href="https://wa.me/2348038879285" className="text-gold-300 hover:underline">+234 803 8879 285</a></p>
                    <p className="text-gray-300">Email: <a href="mailto:support@vianclothinghub.com" className="text-gold-300 hover:underline">support@vianclothinghub.com</a></p>
                    <p className="text-gray-300">Instagram: <a href="https://instagram.com/vianclothinghub" className="text-gold-300 hover:underline">@vianclothinghub</a></p>
                </div>

                <div>
                    <h4 className="font-bold text-lg mb-3 text-purple-100">Newsletter</h4>
                    <p className="text-gray-300">Get updates on new arrivals, exclusive offers & style tips.</p>
                    <form onSubmit={handleSubscribe} className="mt-4">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="p-2 rounded w-full text-black bg-purple-400 mb-2"
                            required
                        />
                        <button type="submit" className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-gold-400 transition-colors duration-200">
                            Subscribe
                        </button>
                    </form>
                </div>
            </div>

            <div className="text-center text-sm text-gray-500">
                © {new Date().getFullYear()} Vian Clothing Hub. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;