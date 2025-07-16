import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CustomOrderForm() {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    fabric: '',
    style: '',
    measurements: '',
    additional_notes: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('custom_orders').insert([form]);
    setLoading(false);
    if (error) {
      alert('Error submitting order: ' + error.message);
    } else {
      setSuccess(true);
      setForm({
        full_name: '',
        phone: '',
        email: '',
        fabric: '',
        style: '',
        measurements: '',
        additional_notes: '',
        address: '',
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md mt-10">
      <h2 className="text-2xl font-bold mb-4 text-purple-600">Custom Order</h2>

      {success && (
        <div className="bg-green-100 text-green-800 p-3 rounded mb-4">
          Order submitted successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Full Name" className="w-full p-2 border rounded" required />

        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" className="w-full p-2 border rounded" required />

        <input name="email" value={form.email} onChange={handleChange} placeholder="Email (optional)" className="w-full p-2 border rounded" />

        <select name="fabric" value={form.fabric} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Choose Fabric</option>
          <option value="Ankara">Ankara</option>
          <option value="Lace">Lace</option>
          <option value="Adire">Adire</option>
          <option value="Senator">Senator</option>
        </select>

        <select name="style" value={form.style} onChange={handleChange} className="w-full p-2 border rounded" required>
          <option value="">Choose Style</option>
          <option value="Bubu">Bubu</option>
          <option value="Kaftan">Kaftan</option>
          <option value="2-piece">2-Piece</option>
          <option value="Gown">Gown</option>
        </select>

        <textarea name="measurements" value={form.measurements} onChange={handleChange} placeholder="Measurements (optional)" className="w-full p-2 border rounded" />

        <textarea name="additional_notes" value={form.additional_notes} onChange={handleChange} placeholder="Additional Notes (optional)" className="w-full p-2 border rounded" />

        <textarea name="address" value={form.address} onChange={handleChange} placeholder="Delivery Address" className="w-full p-2 border rounded" required />

        <button disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
          {loading ? 'Submitting...' : 'Submit Order'}
        </button>
      </form>
    </div>
  );
}
