import { supabase } from '@/lib/supabaseClient';

// Utility function to verify payment
const verifyPayment = async ({ reference, setError, setIsPaying, orderCallback, useApiFallback }) => {
  try {
    let verificationResponse;
    if (useApiFallback) {
      const apiResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      verificationResponse = await apiResponse.json();
      console.log('API verification response:', verificationResponse);
    } else {
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
    setIsPaying(false);
    return true;
  } catch (err) {
    console.error('Verification error:', err.message);
    setError('Payment verification failed: ' + err.message);
    setIsPaying(false);
    return false;
  }
};

// Global callback for Paystack
const PAYSTACK_CALLBACK_ID = `paystack_callback_${Date.now()}`;
window[PAYSTACK_CALLBACK_ID] = (response) => {
  // Post message to the main window
  window.postMessage({ type: 'PAYSTACK_PAYMENT', reference: response.reference }, '*');
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

    // Set up a message listener for the payment result
    const handleMessage = (event) => {
      if (event.data.type === 'PAYSTACK_PAYMENT') {
        verifyPayment({ reference: event.data.reference, setError, setIsPaying, orderCallback, useApiFallback })
          .then((success) => {
            window.removeEventListener('message', handleMessage);
            resolve(success);
          })
          .catch((err) => {
            window.removeEventListener('message', handleMessage);
            reject(err);
          });
      }
    };
    window.addEventListener('message', handleMessage);

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
        callback: window[PAYSTACK_CALLBACK_ID],
        onClose: () => {
          setError('Payment cancelled.');
          setIsPaying(false);
          window.removeEventListener('message', handleMessage);
          reject(new Error('Payment cancelled'));
        },
      });
    } catch (err) {
      console.error('Paystack error:', err.message);
      setError('Failed to initialize payment: ' + err.message);
      setIsPaying(false);
      window.removeEventListener('message', handleMessage);
      reject(err);
    }
  });
};