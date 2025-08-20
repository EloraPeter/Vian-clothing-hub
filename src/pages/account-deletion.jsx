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

export default function AccountDeletion({ profile }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle self-service account deletion
  const handleSelfDeletion = async () => {
    if (!password) {
      setErrorMessage('Please enter your password to confirm deletion.');
      toast.error('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No user logged in.');

      // Verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInError) throw new Error('Incorrect password. Please try again.');

      // Delete associated data
      await Promise.all([
        supabase.from('profiles').delete().eq('id', user.id),
        supabase.from('orders').delete().eq('user_id', user.id),
        supabase.from('custom_orders').delete().eq('user_id', user.id),
        supabase.from('wishlist').delete().eq('user_id', user.id),
        supabase.from('invoices').delete().eq('user_id', user.id),
        supabase.from('receipts').delete().eq('user_id', user.id),
        supabase.from('notifications').delete().eq('user_id', user.id),
      ]);

      // Revoke Facebook OAuth tokens (if applicable)
      if (user.app_metadata.provider === 'facebook') {
        await supabase.auth.signOut(); // Clears OAuth tokens
      }

      // Delete Supabase auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) throw new Error('Failed to delete account: ' + authError.message);

      // Send confirmation email
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: 'Vian Clothing Hub Account Deletion Confirmation',
          html: `
            <h2>Account Deletion Confirmation</h2>
            <p>Dear ${profile?.first_name || 'Customer'},</p>
            <p>Your Vian Clothing Hub account and associated data have been permanently deleted as of ${new Date().toLocaleString()}. This includes your profile, orders, wishlist, and any data shared via Facebook login.</p>
            <p>If this was a mistake, please contact <a href="mailto:support@vianclothinghub.com.ng">support@vianclothinghub.com.ng</a> immediately.</p>
            <p>Thank you for shopping with us!</p>
            <p>Vian Clothing Hub Team</p>
          `,
        }),
      });

      setSuccessMessage('Your account and data have been deleted. You will be redirected to the homepage in 5 seconds.');
      toast.success('Account deleted successfully.');
      setTimeout(() => router.push('/'), 5000);
    } catch (error) {
      setErrorMessage(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

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
            If you have access to your account, you can delete it directly. This removes your profile, orders, custom orders, wishlist, invoices, receipts, notifications, and any Facebook login data.
          </p>
          <ol className="list-decimal list-inside space-y-2 mb-6 text-gray-700">
            <li>Ensure you are logged in. If not, go to <Link href="/auth" className="text-purple-600 hover:underline">vianclothinghub.com.ng/auth</Link>.</li>
            <li>Enter your password below to confirm your identity.</li>
            <li>Click "Delete My Account" and confirm. You will receive an email confirmation.</li>
            <li>After deletion, you will be logged out and redirected to the homepage.</li>
          </ol>
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
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            onClick={handleSelfDeletion}
            disabled={loading}
            className={`bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
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