'use client';

import Head from 'next/head';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/footer';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';


export default function AccountDeletion({ profile }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [user, setUser] = useState(null);

    // Check and refresh session on mount
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                setErrorMessage('Please log in to delete your account.');
                toast.error('Session expired. Redirecting to login...');
                setTimeout(() => router.push('/auth'), 2000);
                return;
            }
            setUser(session.user);
        };
        checkSession();
    }, [router]);

    const oauthProviders = ['facebook', 'google']; // Add more providers as needed

    // Handle self-service account deletion
    const handleSelfDeletion = async () => {
        if (!user) {
            setErrorMessage('No user logged in. Please log in again.');
            toast.error('No user logged in.');
            return;
        }
        if (!oauthProviders.includes(profile?.provider) && !password) {
            setErrorMessage('Please enter your password to confirm deletion.');
            toast.error('Please enter your password.');
            return;
        }

        setLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error('Session expired. Please log in again.');

            const response = await fetch('/api/delete-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    password: oauthProviders.includes(profile?.provider) ? null : password,
                    userId: user.id,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete account');

            setSuccessMessage('Your account and data have been deleted. You will be redirected to the homepage in 5 seconds.');
            toast.success('Account deleted successfully.');
            setTimeout(() => router.push('/'), 5000);
        } catch (error) {
            console.error('Fetch error:', error);
            setErrorMessage(error.message || 'An unexpected error occurred.');
            toast.error(error.message || 'An unexpected error occurred.');
            if (error.message.includes('Session expired')) {
                setTimeout(() => router.push('/auth'), 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!user && !errorMessage) {
        return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;
    }

    return (
        <>
            <Head>
                <title>Account Deletion - Vian Clothing Hub</title>
                <meta
                    name="description"
                    content="Learn how to delete your Vian Clothing Hub account and personal data, including data shared via Facebook login."
                />
                <meta
                    name="keywords"
                    content="account deletion, data privacy, Facebook OAuth, Vian Clothing Hub, Nigeria"
                />
                <meta name="author" content="Vian Clothing Hub" />
                <meta property="og:title" content="Account Deletion - Vian Clothing Hub" />
                <meta
                    property="og:description"
                    content="Permanently delete your Vian Clothing Hub account and associated data, including Facebook login information."
                />
                <meta name="robots" content="index, follow" />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'WebPage',
                            'name': 'Account Deletion - Vian Clothing Hub',
                            'description': 'Instructions for deleting your account and personal data from Vian Clothing Hub.',
                            'url': 'https://vianclothinghub.com.ng/account-deletion',
                            'publisher': {
                                '@type': 'Organization',
                                'name': 'Vian Clothing Hub',
                                'contactPoint': {
                                    '@type': 'ContactPoint',
                                    'email': 'support@vianclothinghub.com.ng',
                                    'contactType': 'Customer Service',
                                },
                            },
                        }),
                    }}
                />
            </Head>
            <div className="min-h-screen bg-gray-100">
                <Navbar profile={profile} />
                <section className="max-w-4xl mx-auto px-4 py-12">
                    <h1 className="text-3xl font-bold text-purple-800 mb-6">Delete Your Account or Data</h1>
                    <p className="text-gray-700 mb-4">
                        At Vian Clothing Hub, we value your privacy. You can delete your account and personal data (e.g., profile, orders, or Facebook login data) using the self-service option below or by requesting assistance. Deletion is permanent and cannot be undone. Some data, like order records, may be retained for 7 years as required by Nigerian tax law.
                    </p>
                    <p className="text-gray-700 mb-6">
                        <strong>Last Updated:</strong> August 20, 2025
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-700 mb-4">Option 1: Delete Your Account Yourself</h2>
                    <p className="text-gray-700 mb-4">
                        If you have access to your account, you can delete it directly. This removes your profile, orders, custom orders, wishlist, invoices, receipts, notifications, and any Facebook login data. If you signed up with Facebook, no password is required.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 mb-6 text-gray-700">
                        <li>Ensure you are logged in. If not, go to <Link href="/auth" className="text-purple-600 hover:underline">vianclothinghub.com.ng/auth</Link>.</li>
                        <li>If you used email signup, enter your password below to confirm your identity. Facebook users can skip this step.</li>
                        <li>Click "Delete My Account" and confirm. You will receive an email confirmation.</li>
                        <li>After deletion, you will be logged out and redirected to the homepage.</li>
                    </ol>
                    {oauthProviders.includes(profile?.provider) ? null : (
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                                Enter Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                                    placeholder="Your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-2 text-gray-600"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleSelfDeletion}
                        disabled={loading || !user}
                        className={`bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors ${loading || !user ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {loading ? 'Deleting...' : 'Delete My Account'}
                    </button>
                    {successMessage && <p className="text-green-600 mt-4">{successMessage}</p>}
                    {errorMessage && <p className="text-red-600 mt-4">{errorMessage}</p>}

                    <h2 className="text-2xl font-semibold text-purple-700 mt-8 mb-4">Option 2: Request Data Deletion</h2>
                    <p className="text-gray-700 mb-4">
                        If you cannot access your account or want to delete specific data (e.g., only Facebook login data), submit a request. We will verify your identity and process the request within 30 days.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 mb-6 text-gray-700">
                        <li>
                            Email <a href="mailto:support@vianclothinghub.com.ng" className="text-purple-600 hover:underline">
                                support@vianclothinghub.com.ng
                            </a>{' '}
                            with the subject "Data Deletion Request".
                        </li>
                        <li>Include your full name, registered email, and, if applicable, your Facebook account ID.</li>
                        <li>Specify what to delete: full account, specific data (e.g., Facebook login data), or all personal info.</li>
                        <li>We may request ID verification for security.</li>
                        <li>You will receive a confirmation email once the deletion is complete.</li>
                    </ol>

                    <h2 className="text-2xl font-semibold text-purple-700 mt-8 mb-4">Facebook Login Data Deletion</h2>
                    <p className="text-gray-700 mb-4">
                        If you used Facebook to log in, we may have your name, email, and profile picture. To delete this data:
                    </p>
                    <ul className="list-disc list-inside space-y-2 mb-6 text-gray-700">
                        <li>Use the self-service deletion option above to remove all data, including Facebook login data.</li>
                        <li>
                            Or, submit a request to <a href="mailto:support@vianclothinghub.com.ng" className="text-purple-600 hover:underline">
                                support@vianclothinghub.com.ng
                            </a>.
                        </li>
                        <li>
                            Alternatively, revoke access directly in Facebook: Go to Settings &gt; Apps and Websites &gt; Find "Vian Clothing Hub" &gt; Remove.
                        </li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-purple-700 mt-8 mb-4">Google Login Data Deletion</h2>
                    <p className="text-gray-700 mb-4">
                        If you used Google to log in, we may have your name, email, and profile picture. To delete this data:
                    </p>
                    <ul className="list-disc list-inside space-y-2 mb-6 text-gray-700">
                        <li>Use the self-service deletion option above to remove all data, including Google login data.</li>
                        <li>
                            Or, submit a request to <a href="mailto:support@vianclothinghub.com.ng" className="text-purple-600 hover:underline">
                                support@vianclothinghub.com.ng
                            </a>.
                        </li>
                        <li>
                            Alternatively, revoke access directly in Google: Go to Google Account &gt; Security &gt; Your connections to third-party apps & services &gt; Find "Vian Clothing Hub" &gt; Remove access.
                        </li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-purple-700 mt-8 mb-4">What Happens After Deletion?</h2>
                    <ul className="list-disc list-inside space-y-2 mb-6 text-gray-700">
                        <li>You will lose access to your account, orders, custom orders, wishlist, and other data.</li>
                        <li>Pending orders may be canceled; contact support first if you have active orders.</li>
                        <li>Payment information is not stored by us (handled by Paystack) and is unaffected.</li>
                        <li>Some data (e.g., order records for tax purposes) may be retained for 7 years as required by law.</li>
                        <li>If you change your mind, you must create a new account, as deleted data cannot be recovered.</li>
                    </ul>

                    <p className="text-gray-700 mt-8">
                        For questions, contact us via our{' '}
                        <Link href="/contact" className="text-purple-600 hover:underline">
                            Contact Page
                        </Link>{' '}
                        or email{' '}
                        <a href="mailto:support@vianclothinghub.com.ng" className="text-purple-600 hover:underline">
                            support@vianclothinghub.com.ng
                        </a>.
                    </p>
                </section>
                <Footer />
            </div>
        </>
    );
}