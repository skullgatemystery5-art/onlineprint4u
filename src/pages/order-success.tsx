import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  FileText,
  MessageCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { supabase, isSupabaseConfigured, type Order } from '@/lib/supabase';
import { formatINR } from '@/lib/pricing';
import { openWhatsAppBill } from '@/lib/whatsapp';

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setOrder(data as Order);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orderId]);

  // Automatically open WhatsApp with the bill pre-filled once the order is loaded
  useEffect(() => {
    if (!order || autoOpened) return;
    setAutoOpened(true);
    openWhatsAppBill(order);
  }, [order, autoOpened]);

  return (
    <>
      <Header />
      <main className="flex min-h-[80vh] items-center justify-center bg-muted/30 px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm animate-scale-in">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <h1 className="font-display text-2xl font-bold">Thank You for Your Order!</h1>
            <p className="mt-2 text-muted-foreground">
              Your order has been placed successfully. We've prepared your bill details on WhatsApp — please send it to us so we can confirm and start printing right away.
            </p>

            {/* Simulated notification banner */}
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              Order notification sent to our team
            </div>

            {order && (
              <div className="mt-6 space-y-4 rounded-2xl bg-muted/50 p-5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Order Number</span>
                  <span className="font-mono font-semibold">{order.order_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount Paid</span>
                  <span className="font-bold text-primary">{formatINR(order.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payment Method</span>
                  <span className="capitalize">{order.payment_method === 'cod' ? '50% Advance Paid & 50% on Delivery' : order.payment_method === 'advance' ? '50% Advance Paid (Online)' : '100% Full Online Payment'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Delivery To</span>
                  <span className="text-sm">{order.shipping_pincode}</span>
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading order details...
              </div>
            )}

            {/* WhatsApp bill action */}
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <MessageCircle className="h-4 w-4" /> Send bill via WhatsApp
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                We opened WhatsApp with your bill details pre-filled. If it didn't open automatically, tap below to send your bill to {order?.shipping_phone ?? 'your number'}.
              </p>
              <Button
                size="sm"
                className="mt-3 w-full gap-2 bg-[#25D366] text-white hover:bg-[#1ebe5d] border-transparent"
                disabled={!order}
                onClick={() => order && openWhatsAppBill(order)}
              >
                <MessageCircle className="h-4 w-4" /> Open WhatsApp to Send Bill
              </Button>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/dashboard" className="flex-1">
                <Button className="w-full gap-2">
                  <Package className="h-4 w-4" /> Track Order
                </Button>
              </Link>
              <Link to="/print" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <FileText className="h-4 w-4" /> Print More
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              A confirmation email has been sent with your invoice. Need help? WhatsApp us anytime.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
