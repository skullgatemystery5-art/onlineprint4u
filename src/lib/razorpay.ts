interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayErrorResponse {
  error?: { description?: string };
}

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', handler: (response: RazorpayErrorResponse) => void): void;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export interface RazorpayOptions {
  amount: number;
  currency?: string;
  name?: string;
  description?: string;
  orderId?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
}

export interface RazorpayResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
}

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;

export function isRazorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && typeof window !== 'undefined' && window.Razorpay);
}

export function initiateRazorpayPayment(options: RazorpayOptions): Promise<RazorpayResult> {
  return new Promise((resolve) => {
    if (!isRazorpayConfigured()) {
      resolve({ success: false, error: 'Razorpay is not configured. Set VITE_RAZORPAY_KEY_ID in your environment.' });
      return;
    }

    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY_ID,
      amount: Math.round(options.amount * 100),
      currency: options.currency ?? 'INR',
      name: options.name ?? 'Online Print 4U',
      description: options.description ?? 'Print Order Payment',
      order_id: options.orderId,
      prefill: options.prefill,
      notes: options.notes,
      theme: { color: '#2563EB' },
      handler: (response: RazorpayResponse) => {
        resolve({
          success: true,
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          resolve({ success: false, error: 'Payment cancelled by user' });
        },
      },
    });

    rzp.on('payment.failed', (response: RazorpayErrorResponse) => {
      resolve({
        success: false,
        error: response.error?.description ?? 'Payment failed',
      });
    });

    rzp.open();
  });
}
