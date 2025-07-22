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
    deposit: 5000, // Non-refundable deposit
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

  const sendWhatsAppNotification = async (phone, text) => {
    const apiKey = '7165245';
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(text)}&apikey=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error('Failed to send WhatsApp notification:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
    }
  };

  const createAdminNotification = async (message) => {
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true);
    
    if (adminProfiles) {
      for (const admin of adminProfiles) {
        await supabase.from('notifications').insert([
          {
            user_id: admin.id,
            message,
            created_at: new Date().toISOString(),
            read: false,
          },
        ]);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error, data } = await supabase.from('custom_orders').insert([
      {
        ...form,
        user_id: userId,
        status: 'pending',
        delivery_status: 'not_started',
      },
    ]).select().single();

    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Order submitted! Awaiting deposit confirmation.');
      // Notify user via WhatsApp
      const userNotificationText = `Your custom order has been submitted! Fabric: ${form.fabric}, Style: ${form.style}. A non-refundable deposit of ₦5,000 is required. Please check the app for updates: [Your App URL]`;
      await sendWhatsAppNotification(form.phone, userNotificationText);
      // Notify admin via WhatsApp and in-app
      const adminNotificationText = `New custom order submitted by ${form.full_name} (ID: ${data.id}). Fabric: ${form.fabric}, Style: ${form.style}. Please set the outfit price in the admin dashboard.`;
      await sendWhatsAppNotification('2348087522801', adminNotificationText);
      await createAdminNotification(adminNotificationText);
      setForm({
        full_name: '',
        email: form.email,
        phone: '',
        fabric: '',
        style: '',
        measurements: '',
        address: '',
        additional_notes: '',
        deposit: 5000,
      });
    }

    setLoading(false);
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deposit (₦)</label>
        <input
          type="number"
          value={form.deposit}
          readOnly
          className="w-full border p-2 rounded bg-gray-200 text-black cursor-not-allowed"
        />
      </div>

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