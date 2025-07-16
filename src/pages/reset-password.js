// src/pages/reset-password.js
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setMessage(error ? error.message : 'Check your email for reset link.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleReset}
        className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4"
      >
        <h1 className="text-xl font-bold">Reset Password</h1>
        <input
          className="w-full border rounded p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded w-full"
        >
          Send Reset Link
        </button>

        {message && <p className="text-sm text-center mt-2">{message}</p>}
      </form>
    </div>
  );
}
