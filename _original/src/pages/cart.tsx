import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Tag,
  ArrowRight,
  FileText,
  Truck,
  X,
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Coupon } from '@/lib/supabase';
import { formatINR } from '@/lib/pricing';
import { formatWeight } from '@/lib/shipping';
import { cn } from '@/lib/utils';

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items,
    removeItem,
    updateCopies,
    coupon,
    setCoupon,
    couponCode,
    setCouponCode,
    couponError,
    setCouponError,
    shippingRates,
    selectedCourier,
    setSelectedCourier,
    pincode,
    setPincode,
    totals,
    totalWeightGrams,
    shippingMethods,
    pincodeValid,
    clearCart,
  } = useCart();

  const [applying, setApplying] = useState(false);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Enter a coupon code.');
      return;
    }
    setApplying(true);
    setCouponError(null);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('active', true)
        .maybeSingle();

      if (error || !data) {
        setCoupon(null);
        setCouponError('Invalid coupon code.');
        toast.error('Invalid coupon code.');
        return;
      }

      const c = data as Coupon;
      if (c.expires_at && new Date(c.expires_at) < new Date()) {
        setCoupon(null);
        setCouponError('This coupon has expired.');
        toast.error('This coupon has expired.');
        return;
      }

      setCoupon(c);
      toast.success(`Coupon applied: ${c.code}`);
    } catch {
      setCouponError('Failed to apply coupon.');
    } finally {
      setApplying(false);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center bg-muted/30 px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">Your cart is empty</h1>
            <p className="mt-2 text-muted-foreground">
              Upload your documents and start printing.
            </p>
            <Link to="/print" className="mt-6 inline-block">
              <Button className="gap-2">
                <FileText className="h-4 w-4" /> Upload Documents
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-10">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <h1 className="mb-6 font-display text-3xl font-bold">Shopping Cart</h1>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="space-y-4 lg:col-span-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-display text-sm font-semibold">{item.fileName}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{item.pages} pages</span>
                        <span>{item.printType === 'bw' ? 'B&W' : 'Color'}</span>
                        <span>{item.side === 'single' ? 'Single' : 'Double'} side</span>
                        <span className="capitalize">{item.orientation}</span>
                        <span>{item.paperGsm} GSM</span>
                        {item.binding !== 'none' && <span className="capitalize">{item.binding} binding</span>}
                        {item.lamination !== 'none' && <span>Laminated</span>}
                        {item.premiumPhoto && <span>Premium Photo</span>}
                      </div>
                      <p className="mt-2 font-bold text-primary">{formatINR(item.price)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          onClick={() => updateCopies(item.id, item.copies - 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold">{item.copies}</span>
                        <button
                          onClick={() => updateCopies(item.id, item.copies + 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          removeItem(item.id);
                          toast.success('Item removed from cart.');
                        }}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between">
                <Link to="/print">
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" /> Add More Documents
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearCart();
                    toast.success('Cart cleared.');
                  }}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" /> Clear Cart
                </Button>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              {/* Coupon */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
                  <Tag className="h-4 w-4 text-primary" /> Apply Coupon
                </h3>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="WELCOME50"
                    className="uppercase"
                  />
                  <Button onClick={applyCoupon} disabled={applying} size="sm">
                    Apply
                  </Button>
                </div>
                {coupon && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-sm">
                    <span className="font-medium text-emerald-700">{coupon.code} applied</span>
                    <button
                      onClick={() => {
                        setCoupon(null);
                        setCouponCode('');
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="mt-2 text-xs text-destructive">{couponError}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Try: WELCOME50 (₹50 off ₹200+) or PRINT10 (10% off ₹500+)
                </p>
              </div>

              {/* Shipping Preview */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
                  <Truck className="h-4 w-4 text-primary" /> Delivery Estimate
                </h3>
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Calculated Weight:</span>
                  <span className="font-semibold text-primary">{formatWeight(totalWeightGrams)}</span>
                </div>
                {pincodeValid ? (
                  <div className="space-y-2">
                    {shippingMethods.slice(0, 3).map((m) => (
                      <div
                        key={m.type}
                        className={`flex items-center justify-between rounded-lg border-2 px-3 py-2.5 text-sm transition-all ${
                          selectedCourier === m.type ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div>
                          <p className="font-medium">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.estimatedDays}</p>
                        </div>
                        <span className={`font-bold ${m.cost === 0 ? 'text-emerald-600' : 'text-primary'}`}>
                          {m.cost === 0 ? 'Free' : formatINR(m.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Enter your pincode at checkout to see delivery options and exact shipping costs.
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-3 font-display text-sm font-semibold">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatINR(totals.subtotal)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{formatINR(totals.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatINR(totals.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatINR(totals.total)}</span>
                  </div>
                </div>
                <Button onClick={handleCheckout} className="mt-4 w-full gap-2" size="lg">
                  Proceed to Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
