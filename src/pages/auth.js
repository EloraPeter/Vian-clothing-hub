import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import zxcvbn from 'zxcvbn';


export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strengthScore, setStrengthScore] = useState(0);

  const toggleMode = () => {
    setMessage('');
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (mode === 'signup') {
      // Signup flow
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (error) setMessage(error.message);
      else setMessage('Signup successful! Please check your email to confirm.');
    } else {
      // Login flow
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) setMessage(error.message);
      else router.push('/dashboard');
    }

    setLoading(false);
  };

  const handleOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) setMessage(error.message);
    // After OAuth, user is redirected automatically by Supabase (make sure redirect URLs are set in Supabase dashboard)
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-bold text-center">
          {mode === 'login' ? 'Log In' : 'Sign Up'}
        </h1>

        <button
          type="button"
          onClick={() => handleOAuth('google')}
          className="bg-red-500 text-white px-4 py-2 rounded w-full"
        >
          Continue with Google
        </button>

        <input
          className="w-full border rounded p-2"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className="w-full border rounded p-2"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={6}
        />

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          {loading ? (mode === 'login' ? 'Logging in...' : 'Signing up...') : mode === 'login' ? 'Log In' : 'Sign Up'}
        </button>

        {message && <p className="text-sm text-center mt-2 text-red-600">{message}</p>}

        <p className="text-center text-sm mt-4">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={toggleMode}
            className="text-purple-700 font-semibold hover:underline"
          >
            {mode === 'login' ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </form>
    </div>
  );
}
