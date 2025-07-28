import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function CustomOrderForm({ onSubmit }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    fabric: '',
    style: '',
    measurements: {
      bust: '',
      waist: '',
      hips: '',
      shoulder: '',
      length: '',
    },
    address: '',
    additional_notes: '',
    deposit: 5000,
  });
  const [showMeasurementGuide, setShowMeasurementGuide] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/auth');
      } else {
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

  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      if (!form.full_name) newErrors.full_name = 'Full name is required';
      if (!form.email) newErrors.email = 'Email is required';
      if (!form.phone) newErrors.phone = 'Phone number is required';
      if (!form.address) newErrors.address = 'Delivery address is required';
    } else if (step === 2) {
      if (!form.fabric) newErrors.fabric = 'Fabric is required';
      if (!form.style) newErrors.style = 'Style is required';
    } else if (step === 3) {
      if (!form.measurements.bust) newErrors.bust = 'Bust measurement is required';
      if (!form.measurements.waist) newErrors.waist = 'Waist measurement is required';
      if (!form.measurements.hips) newErrors.hips = 'Hips measurement is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 4) {
      if (validateStep()) {
        setStep(step + 1);
      }
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error, data } = await supabase.from('custom_orders').insert([
        {
          ...form,
          user_id: (await supabase.auth.getSession()).data.session.user.id,
          status: 'pending',
          delivery_status: 'not_started',
          measurements: JSON.stringify(form.measurements),
        },
      ]).select().single();

      if (error) {
        setMessage('Error: ' + error.message);
      } else {
        setMessage('Order submitted! Proceeding to payment.');
        const userNotificationText = `Your custom order has been submitted! Fabric: ${form.fabric}, Style: ${form.style}. A non-refundable deposit of ₦5,000 is required. Please check the app for updates: [Your App URL]`;
        await sendWhatsAppNotification(form.phone, userNotificationText);
        const adminNotificationText = `New custom order submitted by ${form.full_name} (ID: ${data.id}). Fabric: ${form.fabric}, Style: ${form.style}. Please set the outfit price in the admin dashboard.`;
        await sendWhatsAppNotification('2348087522801', adminNotificationText);
        await createAdminNotification(adminNotificationText);
        onSubmit(form);
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-between mb-8">
      {['Personal Info', 'Design Details', 'Measurements', 'Review'].map((label, index) => (
        <div key={index} className={`flex-1 text-center ${step >= index + 1 ? 'text-purple-700' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${step >= index + 1 ? 'bg-purple-700 text-white' : 'bg-gray-200'}`}>
            {index + 1}
          </div>
          <p className="mt-2 text-sm font-medium">{label}</p>
        </div>
      ))}
    </div>
  );

  const renderMeasurementGuide = () => (
    <div className="bg-gray-100 p-4 rounded-lg mt-4">
      <button
        type="button"
        onClick={() => setShowMeasurementGuide(!showMeasurementGuide)}
        className="flex items-center text-purple-700 font-semibold"
      >
        {showMeasurementGuide ? <ChevronUpIcon className="w-5 h-5 mr-2" /> : <ChevronDownIcon className="w-5 h-5 mr-2" />}
        How to Take Measurements
      </button>
      {showMeasurementGuide && (
        <div className="mt-4 text-sm text-gray-700">
          <p>To ensure your outfit fits perfectly, please take accurate measurements using a measuring tape. Follow these tips:</p>
          <ul className="list-disc pl-5 mt-2">
            <li><strong>Bust:</strong> Measure around the fullest part of your bust, keeping the tape parallel to the floor.</li>
            <li><strong>Waist:</strong> Measure around the narrowest part of your waist, typically above the navel.</li>
            <li><strong>Hips:</strong> Measure around the fullest part of your hips, about 8 inches below the waist.</li>
            <li><strong>Shoulder:</strong> Measure from the edge of one shoulder to the other across your back.</li>
            <li><strong>Length:</strong> For dresses or skirts, measure from the top of the shoulder to the desired hemline.</li>
          </ul>
          <p className="mt-2">For best results, have someone assist you, and wear form-fitting clothing while measuring.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white max-w-3xl mx-auto p-8 rounded-lg shadow-lg my-10">
      {renderStepIndicator()}
      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-purple-800">Personal Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className={`w-full border p-3 rounded-lg ${errors.full_name ? 'border-red-500' : 'border-gray-300'} focus:ring-purple-500 focus:border-purple-500`}
                required
              />
              {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                readOnly
                className="w-full border p-3 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={`w-full border p-3 rounded-lg ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:ring-purple-500 focus:border-purple-500`}
                required
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={`w-full border p-3 rounded-lg ${errors.address ? 'border-red-500' : 'border-gray-300'} focus:ring-purple-500 focus:border-purple-500`}
                required
              />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-purple-800">Design Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fabric</label>
              <input
                type="text"
                value={form.fabric}
                onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                className={`w-full border p-3 rounded-lg ${errors.fabric ? 'border-red-500' : 'border-gray-300'} focus:ring-purple-500 focus:border-purple-500`}
                required
              />
              {errors.fabric && <p className="text-red-500 text-sm mt-1">{errors.fabric}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Style</label>
              <input
                type="text"
                value={form.style}
                onChange={(e) => setForm({ ...form, style: e.target.value })}
                className={`w-full border p-3 rounded-lg ${errors.style ? 'border-red-500' : 'border-gray-300'} focus:ring-purple-500 focus:border-purple-500`}
                required
              />
              {errors.style && <p className="text-red-500 text-sm mt-1">{errors.style}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <textarea
                value={form.additional_notes}
                onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
                className="w-full border p-3 rounded-lg border-gray-300 focus:ring-purple-500 focus:border-purple-500"
                placeholder="E.g., Add embroidery details, specific color preferences, etc."
              />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-purple-800">Measurements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Bust (cm)</label>
                <input
                  type="number"
                  value={form.measurements.bust}
                  onChange={(e) => setForm({ ...form, measurements: { ...form.measurements, bust: e.target.value } })}
                  className={`w-full border p-3 rounded-lg ${errors.bust ? 'border-red-500' : 'border-gray-300'} text-gray-600 focus:ring-purple-500 focus:border-purple-500`}
                  required
                />
                {errors.bust && <p className="text-red-500 text-sm mt-1">{errors.bust}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Waist (cm)</label>
                <input
                  type="number"
                  value={form.measurements.waist}
                  onChange={(e) => setForm({ ...form, measurements: { ...form.measurements, waist: e.target.value } })}
                  className={`w-full border p-3 rounded-lg ${errors.waist ? 'border-red-500' : 'border-gray-300'} text-gray-700 focus:ring-purple-500 focus:border-purple-500`}
                  required
                />
                {errors.waist && <p className="text-red-500 text-sm mt-1">{errors.waist}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hips (cm)</label>
                <input
                  type="number"
                  value={form.measurements.hips}
                  onChange={(e) => setForm({ ...form, measurements: { ...form.measurements, hips: e.target.value } })}
                  className={`w-full border p-3 rounded-lg ${errors.hips ? 'border-red-500' : 'border-gray-300'} text-gray-700 focus:ring-purple-500 focus:border-purple-500`}
                  required
                />
                {errors.hips && <p className="text-red-500 text-sm mt-1">{errors.hips}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Shoulder (cm)</label>
                <input
                  type="number"
                  value={form.measurements.shoulder}
                  onChange={(e) => setForm({ ...form, measurements: { ...form.measurements, shoulder: e.target.value } })}
                  className="w-full border p-3 rounded-lg border-gray-300 text-gray-700 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Length (cm)</label>
                <input
                  type="number"
                  value={form.measurements.length}
                  onChange={(e) => setForm({ ...form, measurements: { ...form.measurements, length: e.target.value } })}
                  className="w-full border p-3 rounded-lg border-gray-300 text-gray-700 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            {renderMeasurementGuide()}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-purple-800">Review Your Order</h2>
            <div className="bg-gray-100 text-gray-900 p-4 rounded-lg">
              <p><strong>Full Name:</strong> {form.full_name}</p>
              <p><strong>Email:</strong> {form.email}</p>
              <p><strong>Phone:</strong> {form.phone}</p>
              <p><strong>Delivery Address:</strong> {form.address}</p>
              <p><strong>Fabric:</strong> {form.fabric}</p>
              <p><strong>Style:</strong> {form.style}</p>
              <p><strong>Measurements:</strong> Bust: {form.measurements.bust}cm, Waist: {form.measurements.waist}cm, Hips: {form.measurements.hips}cm, Shoulder: {form.measurements.shoulder || '-'}cm, Length: {form.measurements.length || '-'}cm</p>
              <p><strong>Additional Notes:</strong> {form.additional_notes || 'None'}</p>
              <p><strong>Deposit:</strong> ₦{form.deposit}</p>
            </div>
          </div>
        )}
        <div className="flex justify-between mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="bg-gray-300 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-400"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="bg-purple-700 text-white py-2 px-6 rounded-lg hover:bg-purple-800"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-700 text-white py-2 px-6 rounded-lg hover:bg-purple-800 disabled:bg-purple-400"
            >
              {loading ? 'Submitting...' : 'Proceed to Payment'}
            </button>
          )}
        </div>
        {message && <p className="text-center mt-4 text-sm text-green-700">{message}</p>}
      </form>
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-purple-800">Frequently Asked Questions</h3>
        <div className="mt-4 space-y-4">
          <div>
            <p className="font-medium text-gray-700">How long does it take to process a custom order?</p>
            <p className="text-gray-600">Custom orders typically take 2-4 weeks to process, depending on complexity and fabric availability.</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Is the deposit refundable?</p>
            <p className="text-gray-600">The ₦5,000 deposit is non-refundable but will be deducted from the final outfit cost.</p>
          </div>
          <div>
            <p className="font-medium text-gray-700">Can I provide my own fabric?</p>
            <p className="text-gray-600">Yes, you can specify your own fabric in the additional notes section or contact us for details.</p>
          </div>
        </div>
      </div>
    </div>
  );
}