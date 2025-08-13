import { useState } from "react";
import { FaPhone, FaWhatsapp, FaRobot } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const FloatingChatButton = ({ cartItemCount }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleWhatsAppClick = () => {
        const phoneNumber = "+2348122123280";
        const message = encodeURIComponent("Hello, I'd like to inquire about Vian Clothing Hub products!");
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
        setIsMenuOpen(false);
    };

    const handleChatbotClick = () => {
        toast.info("Chatbot feature coming soon!");
        setIsMenuOpen(false);
    };

    return (
        <>
            <ToastContainer />
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="group relative bg-purple-700 text-white p-4 rounded-full shadow-xl hover:bg-purple-800 transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-purple-300"
                    aria-label="Open contact options"
                >
                    <FaPhone className="text-xl pulse-scale transform transition-transform duration-500 group-hover:rotate-180" />
                </button>

                {isMenuOpen && (
                    <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-2xl w-64 p-4 border border-purple-100 transform transition-all duration-300 ease-in-out">
                        <h3 className="text-sm font-semibold text-purple-800 mb-3">Get in Touch</h3>
                        <button
                            onClick={handleWhatsAppClick}
                            className="w-full flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                        >
                            <FaWhatsapp className="text-xl text-green-500" />
                            <span>Chat on WhatsApp</span>
                        </button>
                        <button
                            onClick={handleChatbotClick}
                            className="w-full flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-purple-50 hover:text-purple-800 transition-colors"
                        >
                            <FaRobot className="text-xl text-purple-500" />
                            <span>Chat with Chatbot</span>
                        </button>
                    </div>
                )}
            </div>

            
        </>
    );
};

export default FloatingChatButton;