import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import Link from "next/link";
import zxcvbn from "zxcvbn";
import Spinner from "@/components/Spinner";
import DressLoader from "@/components/DressLoader";
import Head from "next/head";


export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strengthScore, setStrengthScore] = useState(0);

  const toggleMode = () => {
    setMessage("");
    setForm({ email: "", password: "", confirm: "" });
    setMode(mode === "login" ? "signup" : "login");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      if (form.password !== form.confirm) {
        setMessage("Passwords do not match");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (error) setMessage(error.message);
      else setMessage("Signup successful! Please check your email to confirm.");
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
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) setMessage(error.message);
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setForm({ ...form, password: val });
    setStrengthScore(zxcvbn(val).score);
  };

  const strengthText = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["#ef4444", "#f97316", "#facc15", "#4ade80", "#22c55e"];

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
</Head>
    <main className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-rose-50 bg-[url('/african-fabric.jpg')] bg-cover bg-center relative">
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/40 z-0"></div>

      {loading && <DressLoader />}
      <Link
        href="/"
        className="fixed top-6 left-6 z-50 flex items-center space-x-2"
      >
        <img src="/logo.svg" alt="Aunty Nwanne Logo" className="h-20 w-auto invert" />
      </Link>
      <div className="min-h-screen flex flex-col-reverse md:flex-row items-center justify-center px-4 md:px-12 md:py-20 py-8 gap-6 md:gap-8">
        <div className="relative bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md transform transition-all duration-500 hover:scale-105 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-3xl font-extrabold text-center text-purple-800 font-['Playfair_Display']">
              {mode === "login" ? "Welcome Back" : "Join the Style"}
            </h1>

            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="flex items-center justify-center w-full bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.24 10.493v2.773h6.533c-.267 1.467-1.067 2.707-2.24 3.573-1.173.867-2.667 1.307-4.293 1.307-3.36 0-6.213-2.28-7.24-5.333-.533-1.6-.533-3.333 0-4.933.533-1.6 1.707-2.987 3.307-3.853 1.6-.867 3.493-.867 5.093 0 .8.4 1.493.987 2.027 1.707l-2.88 2.88c-.533-.533-1.227-.867-2.027-.867-1.333 0-2.507.867-2.933 2.133-.133.4-.2.813-.2 1.227 0 .413.067.827.2 1.227.427 1.267 1.6 2.133 2.933 2.133 1.067 0 2-.533 2.667-1.333.533-.667.8-1.467.933-2.333H12.24z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative">
              <input
                className="w-full px-6 py-5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="relative">
              <input
                className="w-full px-6 py-5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handlePasswordChange}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 text-sm transition-colors"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {mode === "signup" && form.password && (
              <div className="relative">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(strengthScore + 1) * 20}%`,
                      backgroundColor: strengthColor[strengthScore],
                    }}
                  />
                </div>
                <p className="text-sm font-medium text-gray-700 mt-2">
                  Password Strength: {strengthText[strengthScore]}
                </p>
              </div>
            )}

            {mode === "signup" && (
              <div className="relative">
                <input
                  className="w-full px-6 py-5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={form.confirm}
                  onChange={(e) =>
                    setForm({ ...form, confirm: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 text-sm transition-colors"
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
              disabled={loading}
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
              <p className="text-sm text-center text-red-600 animate-pulse">
                {message}
              </p>
            )}

            <p className="text-center text-sm text-gray-600">
              {mode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                type="button"
                onClick={toggleMode}
                className="text-purple-700 font-semibold hover:underline transition-all duration-300"
              >
                {mode === "login" ? "Sign Up" : "Log In"}
              </button>
            </p>
          </form>
        </div>
        <div className="relative w-full text-left px-10 text-white space-y-4 animate-tilt md:ml-10">
          {mode === "login" ? (
            <>
              <p className="text-4xl md:text-7xl font-bold text-purple-400 tracking-wide">
                Hey, Fashion Icon!
              </p>
              <p className="text-base md:text-2xl text-white leading-relaxed">
                Log in to explore a vibrant collection of authentic African
                fashion, effortlessly track your stylish orders, and unlock
                exclusive deals crafted just for you.
              </p>{" "}
            </>
          ) : (
            <>
              <p className="text-4xl md:text-7xl font-bold text-purple-400 tracking-wide">
                Join the Vibe!
              </p>
              <p className="text-base md:text-2xl text-white leading-relaxed">
                Create your account today and begin your journey into a world of
                bold, elegant, and timeless African fashion handpicked to
                celebrate your unique style and story.
              </p>
            </>
          )}
        </div>
      </div>
    </main></>
  );
}
