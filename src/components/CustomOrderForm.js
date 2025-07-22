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

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.id);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();
      if (profileData) {
        setForm((prev) => ({
          ...prev,
          email: profileData.email || user.email,
          full_name: profileData.full_name || '',
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          email: user.email,
        }));
      }
    }
    fetchUserData();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error: insertError } = await supabase.from('custom_orders').insert([
        {
          ...form,
          user_id: userId,
          status: 'pending',
        },
      ]);

      if (insertError) throw new Error('Order insertion failed: ' + insertError.message);

      // Send WhatsApp notification via CallMeBot
      const notificationMessage = `New custom order from ${form.full_name}: Fabric: ${form.fabric}, Style: ${form.style}, Address: ${form.address}`;
      const encodedMessage = encodeURIComponent(notificationMessage);
      const apiKey = process.env.NEXT_PUBLIC_CALLMEBOT_API_KEY || '7165245';
      const phone = process.env.NEXT_PUBLIC_CALLMEBOT_PHONE || '+2348087522801';
      const response = await fetch(
        `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('CallMeBot API error:', errorText);
        throw new Error('Failed to send notification: ' + errorText);
      }

      console.log('CallMeBot API response:', await response.text());
      setMessage('Order submitted! Awaiting deposit. Notification sent.');
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
    } catch (error) {
      console.error('Submission error:', error.message);
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white max-w-2xl mx-auto p-6 rounded shadow space-y-4 my-10"
    >
      <input
        type="text"
        placeholder="Full Name"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        className="w-full border p-2 rounded bg-gray-100 text-black"
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={form.email}
        readOnly
        className="w-full border p-2 rounded bg-gray-100 text-black"
      />
      <input
        type="text"
        placeholder="Phone"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="w-full border p-2 rounded bg-gray-100 text-black"
        required
      />
      <input
        type="text"
        placeholder="Fabric"
        value={form.fabric}
        onChange={(e) => setForm({ ...form, fabric: e.target.value })}
        className="w-full border p-2 rounded bg-gray-100 text-black"
        required
      />
      <input
        type="text"
        placeholder="Style"
        value={form.style}
        onChange={(e) => setForm({ ...form, style: e.target.value })}
        className="w-full border p-2 rounded bg-gray-100 text-black"
        required
      />
      <textarea
        placeholder="Measurements"
        value={form.measurements}
        onChange={(e) => setForm({ ...form, measurements: e.target.value })}
        className="w-full border p-2 rounded bg-gray-100 text-black"
      />
      <textarea
        placeholder="Delivery Address"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        className="w-full border p-2 rounded bg-gray-100 text-black"
        required
      />
      <textarea
        placeholder="Additional Notes"
        value={form.additional_notes}
        onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
        className="w-full border p-2 rounded bg-gray-100 text-black"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-purple-700 text-white w-full py-2 rounded hover:bg-purple-800"
      >
        {loading ? 'Submitting...' : 'Place Order'}
      </button>
      {message && (
        <p className={`text-center mt-2 text-sm ${message.startsWith('Error') ? 'text-red-700' : 'text-green-700'}`}>
          {message}
        </p>
      )}
    </form>
  );
}