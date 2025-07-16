// src/pages/signup.js
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Signup() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
        });

        if (error) {
            setMessage(error.message);
        } else {
            setMessage('Check your email to confirm signup!');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <form
                onSubmit={handleSignup}
                className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4"
            >
                <h1 className="text-xl font-bold">Sign Up</h1>
                <button
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
                />
                <button
                    type="submit"
                    className="bg-black text-white px-4 py-2 rounded w-full"
                    disabled={loading}
                >
                    {loading ? 'Signing up...' : 'Sign Up'}
                </button>

                {message && <p className="text-sm text-center mt-2">{message}</p>}
            </form>
        </div>
    );
}
const handleOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) console.error(error.message);
};
