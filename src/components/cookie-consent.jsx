'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowConsent(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm">
          We use cookies to enhance your experience on Vian Clothing Hub. By continuing, you agree to our{' '}
          <Link href="/policies?section=cookies" className="text-purple-400 hover:underline">
            Cookies Policy
          </Link>{' '}
          and{' '}
          <Link href="/policies?section=terms-of-service" className="text-purple-400 hover:underline">
            Terms of Service
          </Link>.
        </p>
        <div className="flex gap-4">
          <button
            onClick={acceptCookies}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={declineCookies}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}