import { supabase } from '@/lib/supabaseClient';

// Utility function to verify payment
const verifyPayment = async ({ reference, setError, setIsPaying, orderCallback, useApiFallback }) => {
  try {
    let data;

    if (useApiFallback) {
      const apiResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });

      const json = await apiResponse.json();
      console.log('Paystack verification response:', json);

      // ✅ This is the proper condition
      if (!json.status || json.data?.status !== 'success') {
        throw new Error('Payment not successful');
      }

      data = json.data;
    } else {
      const { data: supaData, error } = await supabase.functions.invoke('verify-paystack-payment', {
        body: { reference },
        headers: { 'Content-Type': 'application/json' },
      });

      if (error || supaData?.status !== 'success') {
        throw new Error(error?.message || 'Payment not successful');
      }

      data = supaData;
    }

    // 🧠 If verification passed, now place the order
    await orderCallback(reference);

    setIsPaying(false);
    return true;

  } catch (err) {
    console.error('Payment verification error:', err.message || err);
    setError('Payment verification failed: ' + (err.message || 'Unknown error'));
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

      // Store parameters for callback
      const callbackParams = { setError, setIsPaying, orderCallback, useApiFallback };

      // Define a simple, serializable callback function
      function paystackCallback(response) {
        verifyPayment({ reference: response.reference, ...callbackParams })
          .then((success) => resolve(success))
          .catch((err) => reject(err));
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
          callback: (response) => {
            verifyPayment({ reference: response.reference, setError, setIsPaying, orderCallback, useApiFallback })
              .then((success) => resolve(success))
              .catch((err) => reject(err));
          },
          onCancel: () => {
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