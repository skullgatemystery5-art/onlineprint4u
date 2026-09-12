interface CashfreeResponse {
  payment_session_id: string;
  order_id: string;
}

interface CashfreeResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  error?: string;
}

declare global {
  interface Window {
    Cashfree?: new (options: Record<string, unknown>) => { open(): void };
  }
}

const CASHFREE_APP_ID = import.meta.env.VITE_CASHFREE_APP_ID as string;
const CASHFREE_API_BASE = 'https://sandbox.cashfree.com/pg/orders';

export function isCashfreeConfigured(): boolean {
  return Boolean(CASHFREE_APP_ID && typeof window !== 'undefined');
}

export async function initiateCashfreePayment(options: {
  amount: number;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
}): Promise<CashfreeResult> {
  if (!CASHFREE_APP_ID) {
    return { success: false, error: 'Cashfree is not configured. Set VITE_CASHFREE_APP_ID in your environment.' };
  }

  try {
    const response = await fetch(`${CASHFREE_API_BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': import.meta.env.VITE_CASHFREE_SECRET_KEY as string,
      },
      body: JSON.stringify({
        order_id: options.orderId,
        order_amount: options.amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: options.orderId,
          customer_name: options.customerName,
          customer_email: options.customerEmail || 'guest@onlineprint4u.in',
          customer_phone: '+91' + options.customerPhone,
        },
        order_meta: {
          return_url: options.returnUrl,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { success: false, error: errData.message || 'Failed to create Cashfree order' };
    }

    const data = await response.json() as CashfreeResponse;

    return new Promise((resolve) => {
      if (!window.Cashfree) {
        resolve({ success: false, error: 'Cashfree SDK not loaded' });
        return;
      }

      const cf = new window.Cashfree({
        sessionId: data.payment_session_id,
        orderId: data.order_id,
        orderAmount: String(options.amount),
        orderCurrency: 'INR',
        style: { theme: 'blue' },
        onSuccess: (r: { order_id: string; transaction_id: string }) => {
          resolve({
            success: true,
            paymentId: r.transaction_id,
            orderId: r.order_id,
          });
        },
        onFailure: (r: { orderErrorText?: string }) => {
          resolve({ success: false, error: r.orderErrorText || 'Payment failed' });
        },
      });
      cf.open();
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Cashfree payment error' };
  }
}
