interface PhonePeResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  error?: string;
}

const PHONEPE_MERCHANT_ID = import.meta.env.VITE_PHONEPE_MERCHANT_ID as string;
const PHONEPE_SALT_KEY = import.meta.env.VITE_PHONEPE_SALT_KEY as string;
const PHONEPE_API_BASE = 'https://api-preprod.phonepe.com/apis/pg-sandbox';

export function isPhonePeConfigured(): boolean {
  return Boolean(PHONEPE_MERCHANT_ID && PHONEPE_SALT_KEY);
}

export async function initiatePhonePePayment(options: {
  amount: number;
  orderId: string;
  customerName: string;
  customerPhone: string;
  returnUrl: string;
}): Promise<PhonePeResult> {
  if (!isPhonePeConfigured()) {
    return {
      success: false,
      error: 'PhonePe is not configured. Set VITE_PHONEPE_MERCHANT_ID and VITE_PHONEPE_SALT_KEY in your environment.',
    };
  }

  try {
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: options.orderId,
      merchantUserId: options.orderId,
      amount: Math.round(options.amount * 100),
      redirectUrl: options.returnUrl,
      redirectMode: 'POST',
      callbackUrl: options.returnUrl,
      mobileNumber: options.customerPhone,
      paymentInstrument: { type: 'PAY_PAGE' },
    };

    const response = await fetch(`${PHONEPE_API_BASE}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': `${btoa(PHONEPE_SALT_KEY)}/pg/v1/pay`,
      },
      body: JSON.stringify({ request: btoa(JSON.stringify(payload)) }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to initiate PhonePe payment' };
    }

    const data = await response.json();
    const redirectUrl = data?.data?.instrumentResponse?.redirectInfo?.url;

    if (!redirectUrl) {
      return { success: false, error: 'No redirect URL returned by PhonePe' };
    }

    window.location.href = redirectUrl;
    return { success: true, orderId: options.orderId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'PhonePe payment error' };
  }
}
