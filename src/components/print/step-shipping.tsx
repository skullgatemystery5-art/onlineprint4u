import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Tag,
  Truck,
  Bike,
  Plane,
  Store,
  Clock,
  Check,
  X,
  Weight,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCart } from '@/lib/cart-context';
import { getCouponByCode } from '@/lib/supabase';
import { formatINR } from '@/lib/pricing';
import { formatWeight, type CourierType } from '@/lib/shipping';
import { ShippingPolicyModal } from '@/components/shipping-policy-modal';
import { cn } from '@/lib/utils';

type Props = {
  onBack: () => void;
  onNext: () => void;
};

export function StepShipping({ onBack, onNext }: Props) {
  const {
    coupon,
    setCoupon,
    couponCode,
    setCouponCode,
    couponError,
    setCouponError,
    selectedCourier,
    setSelectedCourier,
    pincode,
    setPincode,
    totals,
    totalWeightGrams,
    shippingMethods,
    pincodeValid,
    isLocal,
  } = useCart();

  const [applying, setApplying] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Enter a coupon code.');
      return;
    }
    setApplying(true);
    setCouponError(null);
    try {
      const data = await getCouponByCode(couponCode.trim().toUpperCase());
      if (!data) {
        setCoupon(null);
        setCouponError('Invalid coupon code.');
        toast.error('Invalid coupon code.');
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCoupon(null);
        setCouponError('This coupon has expired.');
        toast.error('This coupon has expired.');
        return;
      }
      setCoupon(data);
      toast.success(`Coupon applied: ${data.code}`);
    } catch {
      setCouponError('Failed to apply coupon.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Coupon Code — positioned above shipping options */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
          <Tag className="h-4 w-4 text-primary" /> Apply Coupon Code
        </h3>
        <div className="flex gap-2">
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="WELCOME50"
            className="uppercase"
          />
          <Button onClick={applyCoupon} disabled={applying} size="sm">
            {applying ? 'Applying...' : 'Apply'}
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
        {couponError && <p className="mt-2 text-xs text-destructive">{couponError}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          Try: WELCOME50 (₹50 off ₹200+) or PRINT10 (10% off ₹500+)
        </p>
      </div>

      {/* Shipping Options */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-bold">Shipping Options</h2>
          </div>
          <button
            onClick={() => setShowPolicy(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Info className="h-3 w-3" /> Shipping Policy
          </button>
        </div>

        {/* Weight Display */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
          <Weight className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Calculated Weight:</span>
          <span className="font-semibold text-primary">{formatWeight(totalWeightGrams)}</span>
        </div>

        {/* Pincode input */}
        <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
          <Label htmlFor="ship-pincode" className="mb-2 block">
            Delivery Pincode (not needed for Store Pickup)
          </Label>
          <Input
            id="ship-pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit pincode"
            maxLength={6}
            className="max-w-[200px]"
          />
          {pincode.length === 6 && pincodeValid && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isLocal ? 'Local Patna area — Same-day express available!' : 'Outstation — National courier available'}
            </p>
          )}
          {pincode.length === 6 && !pincodeValid && (
            <p className="mt-2 text-xs font-medium text-red-500">Please enter a valid 6-digit pincode</p>
          )}
          {pincode.length < 6 && (
            <p className="mt-2 text-xs text-muted-foreground">Enter your pincode to see delivery options</p>
          )}
        </div>

        {/* Delivery Options */}
        <div className="space-y-3">
          {shippingMethods.map((method) => {
            const icon =
              method.type === 'pickup' ? Store :
              method.type === 'local' ? Bike :
              method.type === 'express_air' ? Plane : Truck;
            const Icon = icon;
            const isSelected = selectedCourier === method.type;
            const isDisabled = !method.available;
            return (
              <button
                key={method.type}
                onClick={() => {
                  if (!isDisabled) setSelectedCourier(method.type as CourierType);
                }}
                disabled={isDisabled}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : isDisabled
                    ? 'border-border opacity-50 cursor-not-allowed'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-semibold">{method.label}</p>
                    {method.freeDelivery && method.available && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        FREE
                      </span>
                    )}
                    {!method.available && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Not available
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                    <Clock className="h-3 w-3" /> {method.estimatedDays}
                  </p>
                </div>
                <div className="text-right">
                  {method.cost === 0 ? (
                    <span className="font-bold text-emerald-600">Free</span>
                  ) : (
                    <span className="font-bold">{formatINR(method.cost)}</span>
                  )}
                </div>
                {isSelected && <Check className="mt-1 h-5 w-5 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost Summary */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatINR(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount {coupon ? `(${coupon.code})` : ''}</span>
              <span>-{formatINR(totals.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{totals.shippingCost === 0 ? 'Free' : formatINR(totals.shippingCost)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatINR(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={!selectedCourier} className="gap-2">
          Next: Checkout <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <ShippingPolicyModal open={showPolicy} onClose={() => setShowPolicy(false)} />
    </div>
  );
}
