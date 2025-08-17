import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import DressLoader from "@/components/DressLoader";
import Spinner from "@/components/Spinner";
import { DateTime } from "luxon";

export default function ResetPassword() {
  const router = useRouter();
  const [mode, setMode] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { access_token } = router.query;
  const [resendCountdown, setResendCountdown] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);

  useEffect(() => {
    // Check if access_token is present for email link-based reset
    if (access_token) {
      setMode("reset");
    }
  }, [access_token]);

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  };

  useEffect(() => {
    let timer;
    if (mode === "otp" && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer); // Cleanup on unmount or mode change
  }, [mode, resendCountdown]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setResendCountdown(60); // Reset countdown
    setIsResendDisabled(true); // Disable resend button

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Please enter a valid email address.");
      setLoading(false);
      return;
    }



    // Generate OTP
    const otpCode = generateOTP();
    // Calculate expiration time in WAT (UTC+1)
    const expiresAt = DateTime.now().setZone("Africa/Lagos").plus({ minutes: 10 }).toJSDate();
    const expiresAtWAT = DateTime.fromJSDate(expiresAt).setZone("Africa/Lagos").toFormat("hh:mm a"); // For user display

    try {
      // Store OTP in Supabase
      const { error: otpError } = await supabase.from("otps").insert({
        email,
        otp: otpCode,
        expires_at: expiresAt.toISOString(), // Store in UTC
      });

      if (otpError) {
        console.error("OTP insertion error:", otpError);
        setMessage(`Error storing OTP: ${otpError.message || "Unknown error"}`);
        setLoading(false);
        return;
      }

      // Send OTP email using Resend
      try {
        const resendResponse = await fetch("/api/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: otpCode, expiresAtWAT }), // Include WAT time
        });

        const resendData = await resendResponse.json();
        if (!resendResponse.ok) {
          console.error("Resend API fetch error:", {
            status: resendResponse.status,
            statusText: resendResponse.statusText,
            data: resendData,
          });
          setMessage(
            `Failed to send OTP email: ${resendData.error || resendResponse.statusText || "Request could not be resolved"}`
          );
          setMode("reset"); // Fallback to Supabase reset link
          return;
        }

        console.log("Resend API success:", resendData);
      } catch (fetchError) {
        console.error("Fetch error for /api/send-otp:", fetchError);
        setMessage(
          `Failed to connect to OTP service: ${fetchError.message || "Network error"}. Use the reset link sent to your email.`
        );
        setMode("reset"); // Fallback to Supabase reset link
        setLoading(false);
        return;
      }

      // Send reset email with Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://vianclothinghub.com.ng/reset-password",
      });

      if (error) {
        console.error("Reset email error:", error);
        setMessage(`Error sending reset email: ${error.message || "Unknown error"}`);
        setLoading(false);
        return;
      }

      setMessage(`Check your email for the reset link and OTP (expires at ${expiresAtWAT} WAT.`);
      setMode("otp");
    } catch (err) {
      console.error("Unexpected error in handleRequestReset:", err);
      setMessage(`An unexpected error occurred: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async (e) => {
    setResendCountdown(60); // Reset to 60 seconds
    setIsResendDisabled(true); // Disable button again
    await handleRequestReset(e); // Reuse existing function
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      console.log('Client time (UTC):', new Date().toISOString());

      const data = await response.json();
      if (!response.ok) {
        console.error('OTP verification error:', data.error);
        setMessage('Invalid or expired OTP. OTPs expire after 10 minutes. Please request a new one.');
        setLoading(false);
        return;
      }

      setMode('reset');
    } catch (err) {
      console.error('Unexpected error in handleVerifyOTP:', err);
      setMessage(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");


    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Password update error:", error);
        setMessage(`Error resetting password: ${error.message || "Unknown error"}`);
        setLoading(false);
        return;
      }

      // Delete used OTP
      const { error: deleteError } = await supabase.from("otps").delete().eq("email", email);

      if (deleteError) {
        console.error("OTP deletion error:", deleteError);
        // Log error but don't block success
      }

      setMessage("Password reset successful! Redirecting to login...");
      setTimeout(() => {
        router.push("/auth");
      }, 2000);
    } catch (err) {
      console.error("Unexpected error in handleResetPassword:", err);
      setMessage(`An unexpected error occurred: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const resetSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Reset Password - Vian Clothing Hub",
    "description": "Reset your Vian Clothing Hub account password securely using an email link or OTP verification.",
    "url": "https://vianclothinghub.com.ng/reset-password",
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
          "name": "Reset Password"
        }
      ]
    },
    "publisher": {
      "@type": "Organization",
      "name": "Vian Clothing Hub",
      "logo": {
        "@type": "ImageObject",
        "url": "https://vianclothinghub.com.ng/logo.svg"
      }
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password - Vian Clothing Hub</title>
        <meta
          name="description"
          content="Reset your Vian Clothing Hub account password securely using an email link or OTP verification."
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Vian Clothing Hub" />
        <meta name="keywords" content="Vian Clothing Hub, Reset Password, African fashion, User account" />
        <meta property="og:title" content="Reset Password - Vian Clothing Hub" />
        <meta
          property="og:description"
          content="Securely reset your Vian Clothing Hub account password."
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(resetSchema) }}
        />
      </Head>
      <main className="min-h-screen bg-[url('/african-fabric.jpg')] bg-cover bg-center relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <DressLoader />
          </div>
        )}
        <Link
          href="/"
          className="fixed top-6 left-6 z-50 flex items-center space-x-2"
        >
          <img src="/logo.svg" alt="Vian Clothing Hub Logo" className="h-16 w-auto invert" />
        </Link>
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 md:py-12">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-500 hover:shadow-2xl animate-fade-in">
            {mode === "request" && (
              <form onSubmit={handleRequestReset} className="space-y-6" aria-label="Password reset request form">
                <h1 className="text-3xl font-extrabold text-center text-purple-800 font-['Playfair_Display']">
                  Reset Your Password
                </h1>
                <div className="relative">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-required="true"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                  disabled={loading}
                  aria-label="Send reset link"
                >
                  {loading ? <Spinner size="sm" color="white" /> : "Send Reset Link"}
                </button>
                {message && (
                  <div className="relative bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center justify-between animate-pulse">
                    <span>{message}</span>
                    <button
                      onClick={() => setMessage("")}
                      className="text-red-600 hover:text-red-800"
                      aria-label="Dismiss message"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <p className="text-center text-sm text-gray-600">
                  Back to{" "}
                  <Link
                    href="/auth"
                    className="text-purple-700 font-semibold hover:underline transition-all duration-300"
                    aria-label="Back to login"
                  >
                    Log In
                  </Link>
                </p>
              </form>
            )}
            {mode === "otp" && (
              <form onSubmit={handleVerifyOTP} className="space-y-6" aria-label="OTP verification form">
                <h1 className="text-3xl font-extrabold text-center text-purple-800 font-['Playfair_Display']">
                  Verify OTP
                </h1>
                <div className="relative">
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                    OTP Code
                  </label>
                  <input
                    id="otp"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    aria-required="true"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                  disabled={loading}
                  aria-label="Verify OTP"
                >
                  {loading ? <Spinner size="sm" color="white" /> : "Verify OTP"}
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                  disabled={isResendDisabled || loading}
                  aria-label="Resend OTP"
                >
                  {isResendDisabled ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
                </button>
                {message && (
                  <div className="relative bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center justify-between animate-pulse">
                    <span>{message}</span>
                    <button
                      onClick={() => setMessage("")}
                      className="text-red-600 hover:text-red-800"
                      aria-label="Dismiss message"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <p className="text-center text-sm text-gray-600">
                  Back to{" "}
                  <Link
                    href="/auth"
                    className="text-purple-700 font-semibold hover:underline transition-all duration-300"
                    aria-label="Back to login"
                  >
                    Log In
                  </Link>
                </p>
              </form>
            )}
            {mode === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-6" aria-label="Password reset form">
                <h1 className="text-3xl font-extrabold text-center text-purple-800 font-['Playfair_Display']">
                  Set New Password
                </h1>
                <div className="relative">
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-10 text-gray-500 hover:text-gray-800 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <div className="relative">
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-10 text-gray-500 hover:text-gray-800 transition-colors"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                  disabled={loading}
                  aria-label="Reset password"
                >
                  {loading ? <Spinner size="sm" color="white" /> : "Reset Password"}
                </button>
                {message && (
                  <div className="relative bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center justify-between animate-pulse">
                    <span>{message}</span>
                    <button
                      onClick={() => setMessage("")}
                      className="text-red-600 hover:text-red-800"
                      aria-label="Dismiss message"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <p className="text-center text-sm text-gray-600">
                  Back to{" "}
                  <Link
                    href="/auth"
                    className="text-purple-700 font-semibold hover:underline transition-all duration-300"
                    aria-label="Back to login"
                  >
                    Log In
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}