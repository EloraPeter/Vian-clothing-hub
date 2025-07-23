module.exports = {
    content: [
        "./*.html",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'spin-slow': 'spin 3s linear infinite',
                'ping': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                ping: {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '75%, 100%': { transform: 'scale(2)', opacity: '0' },
                },
            },
        },
    },
    plugins: [],
}
