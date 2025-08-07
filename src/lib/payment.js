import { supabase } from '@/lib/supabaseClient';

// Utility function to verify payment
const verifyPayment = async ({ reference, setError, setIsPaying, orderCallback, useApiFallback }) => {
  try {
    let paymentData;

    if (useApiFallback) {
      const apiResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });

      let json;
      try {
        json = await apiResponse.json();
      } catch (error) {
        console.error('JSON parsing error:', error);
        throw new Error('Failed to parse payment verification response');
      }

      console.log('Paystack verification response:', json);

      if (!json || !json.data || (json.status !== true && json.status !== 'true') || json.data.status !== 'success') {
        console.error('Verification failed:', { json });
        throw new Error('Payment not successful (fallback)');
      }

      paymentData = json.data;
    } else {
      const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
        body: { reference },
        headers: { 'Content-Type': 'application/json' },
      });

      if (error || data?.status !== 'success') {
        throw new Error(error?.message || 'Payment not successful (supabase)');
      }

      paymentData = data;
    }

    try {
      console.log('Calling orderCallback with reference:', reference);
      await orderCallback(reference);
      setIsPaying(false);
      return true;
    } catch (err) {
      console.error('Order callback failed:', err?.message || err);
      setError('Order placement failed. Please contact support.');
      setIsPaying(false);
      return false;
    }
  } catch (err) {
    console.error('Payment verification error:', err?.message || err);
    setError('Payment verification failed: ' + (err?.message || 'Unknown error'));
    setIsPaying(false);
    return false;
  }
};

export const initiatePayment = ({
  email,
  totalPrice,
  setError,
  setIsPaying,
  orderCallback,
  useApiFallback = false,
}) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      setError('Payment cannot be initiated on the server.');
      setIsPaying(false);
      reject(new Error('Server-side execution'));
      return;
    }

    if (!window.PaystackPop) {
      setError('Paystack SDK not loaded. Please try again.');
      setIsPaying(false);
      reject(new Error('Paystack SDK not loaded'));
      return;
    }

    if (!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      setError('Paystack public key is missing.');
      setIsPaying(false);
      reject(new Error('Paystack public key missing'));
      return;
    }

    if (!email) {
      setError('No valid email found for payment.');
      setIsPaying(false);
      reject(new Error('No valid email'));
      return;
    }

    if (totalPrice <= 0) {
      setError('Invalid order amount.');
      setIsPaying(false);
      reject(new Error('Invalid order amount'));
      return;
    }

    if (typeof orderCallback !== 'function') {
      setError('Invalid callback function provided.');
      setIsPaying(false);
      reject(new Error('Invalid callback function'));
      return;
    }

    try {
      const reference = `VIAN_ORDER_${Date.now()}`;
      console.log('Initiating Paystack payment with:', {
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.slice(0, 10) + '...',
        email,
        amount: totalPrice * 100,
        reference,
      });

      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email,
        amount: totalPrice * 100,
        currency: 'NGN',
        reference,
        callback: async (response) => {
          console.log('Paystack callback response:', response);
          try {
            const success = await verifyPayment({
              reference: response.reference,
              setError,
              setIsPaying,
              orderCallback,
              useApiFallback,
            });
            resolve(success);
          } catch (err) {
            reject(err);
          }
        },
        onClose: () => {
          setError('Payment cancelled.');
          setIsPaying(false);
          reject(new Error('Payment cancelled'));
        },
      });
    } catch (err) {
      console.error('Paystack error:', err.message);
      setError('Failed to initialize payment: ' + err.message);
      setIsPaying(false);
      reject(err);
    }
  });
};