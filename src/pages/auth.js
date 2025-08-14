import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import Link from "next/link";
import zxcvbn from "zxcvbn";
import Spinner from "@/components/Spinner";
import DressLoader from "@/components/DressLoader";
import Head from "next/head";
import { FaEye, FaEyeSlash, FaGoogle } from "react-icons/fa";

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", confirm: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strengthScore, setStrengthScore] = useState(0);

  const toggleMode = () => {
    setMessage("");
    setForm({ email: "", password: "", confirm: "", full_name: "" });
    setMode(mode === "login" ? "signup" : "login");
    setStrengthScore(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      if (!form.full_name.trim()) {
        setMessage("Full name is required");
        setLoading(false);
        return;
      }
      if (form.password !== form.confirm) {
        setMessage("Passwords do not match");
        setLoading(false);
        return;
      }

      // Check for existing profile
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.email)
        .maybeSingle();

      if (profileError) {
        setMessage("Error checking profile: " + profileError.message);
        setLoading(false);
        return;
      }

      if (existingProfile) {
        setMessage("You already have an account. Switching to login...");
        setTimeout(() => {
          setMode("login");
          setForm({ email: "", password: "", confirm: "", full_name: "" });
          setMessage("");
        }, 2000);
        setLoading(false);
        return;
      }

      // Split full name for metadata
      const fullNameParts = form.full_name.trim().split(" ");
      const first_name = fullNameParts[0] || "";
      const last_name = fullNameParts.length > 1 ? fullNameParts.slice(1).join(" ") : null;

      const { data: signUpData, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name,
            last_name,
          },
        },
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Signup successful! Please check your email to confirm.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (error) setMessage(error.message);
      else router.push("/dashboard");
    }

    setLoading(false);
  };

  const handleOAuth = async (provider) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setForm({ ...form, password: val });
    setStrengthScore(zxcvbn(val).score);
  };

  const strengthText = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#22c55e"];

  const authSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": mode === "login" ? "Login - Vian Clothing Hub" : "Sign Up - Vian Clothing Hub",
    "description": mode === "login" ? "Login to your Vian Clothing Hub account and access stylish collections, exclusive deals, and order tracking." : "Create your Vian Clothing Hub account to explore bold and authentic African fashion tailored to your vibe.",
    "url": "https://vianclothinghub.com.ng/auth", // Replace with actual URL
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
          "name": mode === "login" ? "Login" : "Sign Up"
        }
      ]
    },
    "publisher": {
      "@type": "Organization",
      "name": "Vian Clothing Hub",
      "logo": {
        "@type": "ImageObject",
        "url": "https://yourdomain.com/logo.svg"
      }
    }
  };


  return (
    <>
      <Head>
        <title>{mode === "login" ? "Login - Vian Clothing Hub" : "Sign Up - Vian Clothing Hub"}</title>
        <meta
          name="description"
          content={
            mode === "login"
              ? "Login to your Vian Clothing Hub account and access stylish collections, exclusive deals, and order tracking."
              : "Create your Vian Clothing Hub account to explore bold and authentic African fashion tailored to your vibe."
          }
        />
        <meta name="author" content="Vian Clothing Hub" />
        <meta name="keywords" content="Vian Clothing Hub, Login, Signup, African fashion, User account" />
        <meta
          property="og:title"
          content={mode === "login" ? "Login - Vian Clothing Hub" : "Sign Up - Vian Clothing Hub"}
        />
        <meta
          property="og:description"
          content={
            mode === "login"
              ? "Access your Vian Clothing Hub account and keep up with the style."
              : "Join Vian Clothing Hub and step into your fashion era."
          }
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(authSchema) }}
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
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 md:py-12 lg:flex-row lg:gap-12 z-10">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-500 hover:shadow-2xl animate-fade-in">
            <form onSubmit={handleSubmit} className="space-y-6" aria-label={mode === "login" ? "Login form" : "Sign up form"}>
              <h1 className="text-3xl font-extrabold text-center text-purple-800 font-['Playfair_Display']">
                {mode === "login" ? "Welcome Back" : "Join the Style"}
              </h1>

              <button
                type="button"
                onClick={() => handleOAuth("google")}
                className="flex items-center justify-center w-full bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-300"
                aria-label="Sign in with Google"
                disabled={loading}
              >
                <FaGoogle className="w-5 h-5 mr-2" />
                Continue with Google
              </button>

              <div className="relative">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  aria-required="true"
                />
              </div>

              {mode === "signup" && (
                <div className="relative">
                  <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="full-name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                    type="text"
                    placeholder="Enter your full name (e.g., John Doe)"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    aria-required="true"
                    aria-label="Full name"
                  />
                  <p className="text-xs text-gray-500 mt-1">Please enter your first name first (e.g., John Doe).</p>
                </div>
              )}

              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handlePasswordChange}
                  required
                  minLength={6}
                  aria-required="true"
                  aria-describedby="password-strength"
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

              {mode === "signup" && form.password && (
                <div className="relative group">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(strengthScore + 1) * 20}%`,
                        backgroundColor: strengthColor[strengthScore],
                      }}
                    />
                  </div>
                  <p id="password-strength" className="text-sm font-medium text-gray-700 mt-2">
                    Password Strength: {strengthText[strengthScore]}
                  </p>
                  <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-8 left-1/2 transform -translate-x-1/2">
                    {strengthText[strengthScore]} password
                  </div>
                </div>
              )}

              {mode === "signup" && (
                <div className="relative">
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
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
              )}

              <button
                type="submit"
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                disabled={loading}
                aria-label={mode === "login" ? "Log in" : "Sign up"}
              >
                {loading ? (
                  <Spinner size="sm" color="white" />
                ) : mode === "login" ? (
                  "Log In"
                ) : (
                  "Sign Up"
                )}
              </button>

              {message && (
                <div className="relative bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center justify-between animate-pulse">
                  <span>{message}</span>
                  <button
                    onClick={() => setMessage("")}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Dismiss error message"
                  >
                    ✕
                  </button>
                </div>
              )}

              <p className="text-center text-sm text-gray-600">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-purple-700 font-semibold hover:underline transition-all duration-300"
                  aria-label={mode === "login" ? "Switch to sign up" : "Switch to log in"}
                >
                  {mode === "login" ? "Sign Up" : "Log In"}
                </button>
              </p>
            </form>
          </div>
          <div className="w-full max-w-lg text-left px-6 text-white space-y-4 animate-fade-in mt-8 lg:mt-0 lg:ml-12">
            {mode === "login" ? (
              <>
                <h2 className="text-4xl md:text-6xl font-bold text-purple-300 tracking-wide">
                  Hey, Fashion Icon!
                </h2>
                <p className="text-base md:text-xl text-white leading-relaxed">
                  Log in to explore a vibrant collection of authentic African fashion, effortlessly track your stylish orders, and unlock exclusive deals crafted just for you.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-4xl md:text-6xl font-bold text-purple-300 tracking-wide">
                  Join the Vibe!
                </h2>
                <p className="text-base md:text-xl text-white leading-relaxed">
                  Create your account today and begin your journey into a world of bold, elegant, and timeless African fashion handpicked to celebrate your unique style and story.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}