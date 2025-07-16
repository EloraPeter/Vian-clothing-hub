import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function CustomOrderForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    fabric: '',
    style: '',
    measurements: '',
    address: '',
    additional_notes: '',
  });

  const [userId, setUserId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Check auth & set user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth');
      } else {
        setUserId(data.session.user.id);
        setForm((prev) => ({
          ...prev,
          email: data.session.user.email,
        }));
      }
    });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.from('custom_orders').insert([
      {
        ...form,
        user_id: userId,
        status: 'pending',
      },
    ]);

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Order submitted! Awaiting deposit.');
      setForm({
        full_name: '',
        email: '',
        phone: '',
        fabric: '',
        style: '',
        measurements: '',
        address: '',
        additional_notes: '',
      });
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white max-w-2xl mx-auto p-6 rounded shadow space-y-4"
    >
      <input
        type="text"
        placeholder="Full Name"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        className="w-full border p-2 rounded"
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        readOnly
        className="w-full border p-2 rounded bg-gray-100"
      />
      <input
        type="text"
        placeholder="Phone"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="w-full border p-2 rounded"
        required
      />
      <input
        type="text"
        placeholder="Fabric"
        value={form.fabric}
        onChange={(e) => setForm({ ...form, fabric: e.target.value })}
        className="w-full border p-2 rounded"
        required
      />
      <input
        type="text"
        placeholder="Style"
        value={form.style}
        onChange={(e) => setForm({ ...form, style: e.target.value })}
        className="w-full border p-2 rounded"
        required
      />
      <textarea
        placeholder="Measurements"
        value={form.measurements}
        onChange={(e) => setForm({ ...form, measurements: e.target.value })}
        className="w-full border p-2 rounded"
      />
      <textarea
        placeholder="Delivery Address"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        className="w-full border p-2 rounded"
        required
      />
      <textarea
        placeholder="Additional Notes"
        value={form.additional_notes}
        onChange={(e) =>
          setForm({ ...form, additional_notes: e.target.value })
        }
        className="w-full border p-2 rounded"
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-purple-700 text-white w-full py-2 rounded hover:bg-purple-800"
      >
        {loading ? 'Submitting...' : 'Place Order'}
      </button>

      {message && <p className="text-center mt-2 text-sm text-green-700">{message}</p>}
    </form>
  );
}
