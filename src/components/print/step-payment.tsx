import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Check,
  Loader2,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Lock,
  Package,
  MessageCircle,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import {
  insertOrder,
  insertStatusLog,
  insertAddress,
  type Order,
  type OrderItem,
} from '@/lib/database';
import { sendOwnerNotifications } from '@/lib/notify';
import { uploadOrderFile } from '@/lib/storage';
import { formatINR } from '@/lib/pricing';
import { siteConfig, advancePercentage } from '@/lib/site-config';
import { isValidWhatsAppPhone } from '@/lib/whatsapp';
import { initiateRazorpayPayment, isRazorpayConfigured } from '@/lib/razorpay';
import { cn } from '@/lib/utils';
import type { AddressData } from './step-address';

type PaymentMethod = 'advance' | 'full_upi';

type Props = {
  address: AddressData;
  onBack: () => void;
};

export function StepPayment({ address, onBack }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const {
    items,
    fileObjects,
    coupon,
    totals,
    selectedCourier,
    shippingMethods,
    clearCart,
    totalWeightGrams,
  } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('advance');
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [razorpayPaymentId, setRazorpayPaymentId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const orderPlacedRef = useRef(false);

  const advanceAmount = Math.round(totals.total * advancePercentage * 100) / 100;
  const balanceAmount = Math.round((totals.total - advanceAmount) * 100) / 100;
  const amountToPayNow = paymentMethod === 'advance' ? advanceAmount : totals.total;

  const handleRazorpayPayment = async () => {
    if (!user) {
      toast.error('Please log in first.');
      return;
    }
    if (!isRazorpayConfigured()) {
      toast.error('Payment gateway is not configured. Please contact support.');
      return;
    }
    setPaymentProcessing(true);
    const result = await initiateRazorpayPayment({
      amount: amountToPayNow,
      name: 'Online Print 4U',
      description:
        paymentMethod === 'advance'
          ? `50% Advance Payment — Order Total: ${formatINR(totals.total)}`
          : `Full Payment — Order Total: ${formatINR(totals.total)}`,
      prefill: {
        name: profile?.full_name || address.name || '',
        email: profile?.email || address.email || '',
        contact: profile?.phone || address.phone || '',
      },
      notes: {
        payment_type: paymentMethod,
        total_order_value: totals.total.toFixed(2),
      },
    });
    setPaymentProcessing(false);
    if (result.success && result.paymentId) {
      setRazorpayPaymentId(result.paymentId);
      setPaymentDone(true);
      toast.success('Payment successful!');
    } else {
      toast.error(result.error || 'Payment failed. Please try again.');
    }
  };

  const handlePlaceOrder = async () => {
    if (placing) return;
    if (!user) {
      toast.error('Please log in first.');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }
    if (!paymentDone || !razorpayPaymentId) {
      toast.error('Please complete your payment before placing the order.');
      return;
    }

    setPlacing(true);
    const timeoutId = setTimeout(() => {
      setPlacing(false);
      orderPlacedRef.current = false;
      toast.error('Order is taking too long. Please try again or contact support.');
    }, 30000);
    try {
      const orderNumber = `PO4U-${Date.now().toString(36).toUpperCase()}`;
      const deliveryLabel =
        shippingMethods.find((m) => m.type === selectedCourier)?.label ?? selectedCourier;

      const shippingAddress = `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.city}, ${address.state}`;

      const itemsWithUrls: OrderItem[] = await Promise.all(
        items.map(async (item) => {
          const rawFile = fileObjects[item.id];
          if (!rawFile) return item;
          const uploadedFile = await uploadOrderFile(rawFile, orderNumber, item.id);
          return { ...item, filePath: uploadedFile.path, fileUrl: uploadedFile.url };
        })
      );

      const order = await insertOrder({
        order_number: orderNumber,
        user_id: user.uid,
        items: itemsWithUrls,
        subtotal: totals.subtotal,
        discount: totals.discount,
        coupon_code: coupon?.code ?? null,
        shipping_cost: totals.shippingCost,
        total: totals.total,
        payment_method: paymentMethod,
        payment_status: 'paid',
        order_status: 'placed',
        shipping_name: address.name,
        shipping_phone: address.phone,
        shipping_address: shippingAddress,
        shipping_pincode: address.pincode,
        courier_type: selectedCourier,
        delivery_type_label: deliveryLabel,
        payment_screenshot_url: null,
        customer_email: address.email || null,
        tracking_id: null,
        notes: `Razorpay Payment ID: ${razorpayPaymentId}`,
      } as Omit<Order, 'id' | 'created_at' | 'updated_at'>);

      if (!order) throw new Error('Failed to save order');

      // Save address for future reference
      try {
        await insertAddress({
          user_id: user.uid,
          label: 'Checkout',
          name: address.name,
          phone: address.phone,
          alternate_phone: null,
          email: address.email || null,
          line1: address.line1,
          line2: address.line2 || null,
          house_flat: null,
          street_area: null,
          landmark: null,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          delivery_instructions: null,
          is_default: false,
        });
      } catch {
        // Non-blocking
      }

      try {
        await insertStatusLog({
          order_id: order.id,
          status: 'placed',
          note: 'Order placed successfully',
        });
      } catch {
        // Non-blocking
      }

      try {
        await sendOwnerNotifications(order);
      } catch {
        // Non-blocking
      }

      clearCart();
      clearTimeout(timeoutId);
      toast.success('Order placed successfully!');
      navigate(`/order/success?id=${order.id}`);
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      toast.error(msg);
      setPlacing(false);
      orderPlacedRef.current = false;
    }
  };

  // Auto-place order immediately when payment succeeds — no manual button needed
  useEffect(() => {
    if (paymentDone && razorpayPaymentId && !orderPlacedRef.current && !placing) {
      orderPlacedRef.current = true;
      handlePlaceOrder();
    }
  }, [paymentDone, razorpayPaymentId]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Final Checkout</h1>
            <p className="text-sm text-muted-foreground">Choose a payment method to complete your order.</p>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => {
              setPaymentMethod('advance');
              setPaymentDone(false);
              setRazorpayPaymentId(null);
            }}
            className={cn(
              'flex items-start gap-3 rounded-xl border-2 p-4 transition-all text-left',
              paymentMethod === 'advance' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
          >
            <Banknote className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-display text-sm font-semibold">50% Advance + 50% on Delivery</p>
              <p className="text-xs text-muted-foreground">
                Pay {formatINR(advanceAmount)} now, {formatINR(balanceAmount)} on delivery
              </p>
            </div>
            {paymentMethod === 'advance' && <Check className="h-5 w-5 text-primary" />}
          </button>

          <button
            onClick={() => {
              setPaymentMethod('full_upi');
              setPaymentDone(false);
              setRazorpayPaymentId(null);
            }}
            className={cn(
              'flex items-start gap-3 rounded-xl border-2 p-4 transition-all text-left',
              paymentMethod === 'full_upi' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
          >
            <Smartphone className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-display text-sm font-semibold">100% Full Online Payment</p>
              <p className="text-xs text-muted-foreground">Pay {formatINR(totals.total)} via UPI / Card / Net Banking</p>
            </div>
            {paymentMethod === 'full_upi' && <Check className="h-5 w-5 text-primary" />}
          </button>
        </div>

        {/* Payment Action Area */}
        <div className="mt-5 rounded-xl border border-border bg-muted/30 p-5">
          {!paymentDone ? (
            <div className="text-center">
              <p className="mb-1 text-sm font-medium">
                Amount to pay now: <span className="font-bold text-primary">{formatINR(amountToPayNow)}</span>
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Secure payment via Razorpay — UPI, Cards, Net Banking &amp; Wallets
              </p>
              <Button
                onClick={handleRazorpayPayment}
                disabled={paymentProcessing || !user}
                className="gap-2"
                size="lg"
              >
                {paymentProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" /> Pay {formatINR(amountToPayNow)} Now
                  </>
                )}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> 100% Secure &amp; Encrypted Payment
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-semibold">Payment confirmed ({formatINR(amountToPayNow)})</span>
              <span className="ml-1 text-xs text-muted-foreground">ID: {razorpayPaymentId?.slice(0, 14)}...</span>
              <button
                onClick={() => {
                  setPaymentDone(false);
                  setRazorpayPaymentId(null);
                }}
                className="ml-2 text-xs text-muted-foreground hover:underline"
              >
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order Summary */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold">Order Summary</h2>
        <div className="mb-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Check className="h-4 w-4" />
              </div>
              <span className="flex-1 truncate text-muted-foreground">{item.fileName}</span>
              <span className="font-medium">{formatINR(item.price)}</span>
            </div>
          ))}
        </div>
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {paymentMethod === 'advance'
            ? 'Pay 50% Now & Pay Rest 50% After Receiving Your Package!'
            : 'Pay 100% Online Now — No Payment Due on Delivery'}
        </div>
        <div className="mb-4 space-y-2 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Printing &amp; Material Cost</span>
            <span>{formatINR(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount {coupon ? `(${coupon.code})` : ''}</span>
              <span>-{formatINR(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Delivery Fee
              {selectedCourier && shippingMethods.find((m) => m.type === selectedCourier)
                ? ` (${shippingMethods.find((m) => m.type === selectedCourier)?.label})`
                : ''}
            </span>
            <span>{totals.shippingCost === 0 ? 'Free' : formatINR(totals.shippingCost)}</span>
          </div>
        </div>
        <div className="space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
            <span>Total Order Value</span>
            <span className="text-primary">{formatINR(totals.total)}</span>
          </div>
          {paymentMethod === 'advance' && (
            <div className="mt-2 space-y-1 rounded-lg bg-amber-500/10 p-3 text-xs">
              <div className="flex justify-between text-amber-700">
                <span>Advance (50%) — Pay Now</span>
                <span className="font-semibold">{formatINR(advanceAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>On Delivery (50%) — Cash/UPI</span>
                <span>{formatINR(balanceAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {placing && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm font-semibold text-primary">Saving your order...</p>
            <p className="text-xs text-muted-foreground">Please do not close this page.</p>
          </div>
        )}
        {!paymentDone && !placing && (
          <p className="mt-2 text-center text-xs text-amber-600">Complete payment above to place your order</p>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="h-3 w-3" /> Secure checkout • Invoice included
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3 w-3" /> Tri-Layer Zero-Damage Packaging
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> 100% Document Privacy Guaranteed
          </div>
          {isValidWhatsAppPhone(siteConfig.contact.phoneRaw) && (
            <a
              href={`https://wa.me/${siteConfig.contact.phoneRaw}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20"
            >
              <MessageCircle className="h-4 w-4" /> Chat with us on WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="flex justify-start">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    </div>
  );
}
