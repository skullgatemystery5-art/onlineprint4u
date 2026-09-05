import { useEffect, useState, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Printer,
  Package,
  Truck,
  Home,
  Loader2,
  Copy,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/pricing';
import { getOrder, type Order } from '@/lib/database';
import { openWhatsAppBill } from '@/lib/whatsapp';

export const TRACKING_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-500' },
  { key: 'processing', label: 'Processing / Printing', icon: Printer, color: 'text-amber-600', bg: 'bg-amber-500' },
  { key: 'packed', label: 'Packed', icon: Package, color: 'text-orange-600', bg: 'bg-orange-500' },
  { key: 'shipped', label: 'Shipped', icon: Truck, color: 'text-sky-600', bg: 'bg-sky-500' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-500' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500' },
] as const;

const STEP_KEYS = TRACKING_STEPS.map((s) => s.key);

export function getStepIndex(status: string): number {
  const idx = STEP_KEYS.indexOf(status as (typeof STEP_KEYS)[number]);
  return idx === -1 ? 0 : idx;
}

type Props = {
  orderId: string;
  open: boolean;
  onClose: () => void;
};

export function OrderTrackingModal({ orderId, open, onClose }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await getOrder(orderId);
      setOrder(data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (open) fetchOrder();
  }, [open, fetchOrder]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const currentStep = order ? getStepIndex(order.order_status) : 0;
  const isCancelled = order?.order_status === 'cancelled';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl bg-card shadow-2xl animate-slide-in-bottom sm:rounded-3xl sm:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">Track Your Order</h2>
              {order && (
                <p className="font-mono text-xs text-muted-foreground">{order.order_number}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !order ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-display text-lg font-semibold">Order not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We couldn't load the tracking details. Please try again.
            </p>
          </div>
        ) : (
          <div className="px-6 py-6">
            {/* Status Banner */}
            <div
              className={cn(
                'mb-6 flex items-center gap-3 rounded-2xl p-4',
                isCancelled
                  ? 'bg-destructive/10'
                  : 'bg-primary/5'
              )}
            >
              {isCancelled ? (
                <X className="h-6 w-6 text-destructive" />
              ) : (
                <div className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                </div>
              )}
              <div>
                <p
                  className={cn(
                    'text-sm font-bold',
                    isCancelled ? 'text-destructive' : 'text-primary'
                  )}
                >
                  {isCancelled
                    ? 'Order Cancelled'
                    : currentStep === TRACKING_STEPS.length - 1
                    ? 'Order Delivered!'
                    : `Current Status: ${TRACKING_STEPS[currentStep].label}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isCancelled
                    ? 'This order has been cancelled. Contact support for assistance.'
                    : currentStep === TRACKING_STEPS.length - 1
                    ? 'Your order has been successfully delivered.'
                    : `Step ${currentStep + 1} of ${TRACKING_STEPS.length} — ${TRACKING_STEPS[currentStep].label}`}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {!isCancelled && (
              <div className="mb-8">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 ease-out"
                    style={{
                      width: `${((currentStep + 1) / TRACKING_STEPS.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Placed</span>
                  <span>{Math.round(((currentStep + 1) / TRACKING_STEPS.length) * 100)}% Complete</span>
                  <span>Delivered</span>
                </div>
              </div>
            )}

            {/* Step Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-5 bottom-5 w-0.5 bg-border" />

              <div className="space-y-6">
                {TRACKING_STEPS.map((step, i) => {
                  const done = !isCancelled && i <= currentStep;
                  const isCurrent = !isCancelled && i === currentStep;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="relative flex items-start gap-4">
                      {/* Icon circle */}
                      <div
                        className={cn(
                          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500',
                          done
                            ? cn('border-transparent text-white', step.bg)
                            : 'border-border bg-card text-muted-foreground'
                        )}
                      >
                        {done ? (
                          <Icon className="h-5 w-5" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                        {isCurrent && (
                          <span
                            className={cn(
                              'absolute -inset-1 animate-ping rounded-full opacity-30',
                              step.bg
                            )}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              'text-sm font-semibold transition-colors',
                              done ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            {step.label}
                          </p>
                          {isCurrent && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {done
                            ? i === 0
                              ? `Order placed on ${new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                              : i < currentStep
                              ? 'Completed'
                              : 'In progress'
                            : 'Pending'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5">
              <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Order Summary
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-medium">{order.items.length} document{order.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-bold text-primary">{formatINR(order.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Delivery To</span>
                  <span className="font-medium">{order.shipping_name}, {order.shipping_pincode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-medium">
                    {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
                {order.tracking_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Courier Tracking ID</span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold">{order.tracking_id}</span>
                      <button
                        onClick={() => {
                          if (order.tracking_id) navigator.clipboard?.writeText(order.tracking_id);
                        }}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => openWhatsAppBill(order)}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp Support
              </Button>
              <Button
                className="flex-1 gap-2 bg-[#25D366] text-white hover:bg-[#1ebe5d] border-transparent"
                onClick={() => openWhatsAppBill(order)}
              >
                <MessageCircle className="h-4 w-4" /> Send Bill on WhatsApp
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
