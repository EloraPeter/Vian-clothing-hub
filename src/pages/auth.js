import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import zxcvbn from 'zxcvbn';

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strengthScore, setStrengthScore] = useState(0);

  const toggleMode = () => {
    setMessage('');
    setForm({ email: '', password: '', confirm: '' });
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (mode === 'signup') {
      if (form.password !== form.confirm) {
        setMessage('Passwords do not match');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });

      if (error) setMessage(error.message);
      else setMessage('Signup successful! Please check your email to confirm.');
    } else {
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
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setForm({ ...form, password: val });
    setStrengthScore(zxcvbn(val).score);
  };

  const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['#ef4444', '#f97316', '#facc15', '#4ade80', '#22c55e'];

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

        {/* Password field with toggle */}
        <div className="relative">
          <input
            className="w-full border rounded p-2"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={handlePasswordChange}
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2 text-gray-500 hover:text-gray-800 text-sm"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Strength meter for signup only */}
        {mode === 'signup' && form.password && (
          <p
            className="text-sm font-semibold"
            style={{ color: strengthColor[strengthScore] }}
          >
            Password Strength: {strengthText[strengthScore]}
          </p>
        )}

        {/* Confirm password for signup only */}
        {mode === 'signup' && (
          <div className="relative">
            <input
              className="w-full border rounded p-2"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm Password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-2 text-gray-500 hover:text-gray-800 text-sm"
            >
              {showConfirm ? 'Hide' : 'Show'}
            </button>
          </div>
        )}

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          {loading
            ? mode === 'login'
              ? 'Logging in...'
              : 'Signing up...'
            : mode === 'login'
            ? 'Log In'
            : 'Sign Up'}
        </button>

        {message && (
          <p className="text-sm text-center mt-2 text-red-600">{message}</p>
        )}

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
