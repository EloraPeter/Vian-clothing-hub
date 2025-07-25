import { supabase } from '@/lib/supabaseClient';

export const initiatePayment = async ({
  email,
  totalPrice,
  setError,
  setIsPaying,
  orderCallback,
  useApiFallback = false,
}) => {
  if (!window.PaystackPop) {
    setError('Paystack SDK not loaded. Please try again.');
    setIsPaying(false);
    return false;
  }

  if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
    setError('Paystack public key is missing.');
    setIsPaying(false);
    return false;
  }

  if (!email) {
    setError('No valid email found for payment.');
    setIsPaying(false);
    return false;
  }

  if (totalPrice <= 0) {
    setError('Invalid order amount.');
    setIsPaying(false);
    return false;
  }

  if (typeof orderCallback !== 'function') {
    setError('Invalid callback function provided.');
    setIsPaying(false);
    return false;
  }

  // Separate async logic into a function
  const verifyPayment = async (reference) => {
    try {
      let verificationResponse;
      if (useApiFallback) {
        // Use Next.js API route
        const apiResponse = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
        verificationResponse = await apiResponse.json();
        console.log('API verification response:', verificationResponse);
      } else {
        // Use Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
          body: { reference },
          headers: { 'Content-Type': 'application/json' },
        });
        verificationResponse = { data, error };
        console.log('Supabase verification response:', { data, error });
      }

      const { data, error } = verificationResponse;
      if (error || !data?.success) {
        console.error('Payment verification error:', error || data?.error);
        setError('Payment verification failed. Please contact support.');
        setIsPaying(false);
        return false;
      }
      await orderCallback(reference);
      return true;
    } catch (err) {
      console.error('Verification error:', err.message);
      setError('Payment verification failed: ' + err.message);
      setIsPaying(false);
      return false;
    }
  };

  try {
    const reference = `VIAN_ORDER_${Date.now()}`;
    console.log('Initiating Paystack payment with:', {
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.slice(0, 10) + '...',
      email,
      amount: totalPrice * 100,
      reference,
    });

    const handler = new window.PaystackPop();
    handler.open({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email,
      amount: totalPrice * 100, // Convert to kobo
      currency: 'NGN',
      reference,
      callback: (response) => {
        // Non-async callback
        console.log('Paystack callback response:', response);
        // Call async verification function
        verifyPayment(response.reference);
      },
      onClose: () => {
        setError('Payment cancelled.');
        setIsPaying(false);
        return false;
      },
    });
    return true; // Indicate that payment initiation was successful
  } catch (err) {
    console.error('Paystack error:', err.message);
    setError('Failed to initialize payment: ' + err.message);
    setIsPaying(false);
    return false;
  }
};