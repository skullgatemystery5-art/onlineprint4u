import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  MapPin,
  Check,
  Loader2,
  Truck,
  ShieldCheck,
  QrCode,
  Smartphone,
  CheckCircle2,
  Bike,
  Plane,
  Store,
  Package,
  Clock,
  Info,
  MessageCircle,
  Weight,
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Address, type Order } from '@/lib/supabase';
import { formatINR } from '@/lib/pricing';
import { siteConfig, advancePercentage } from '@/lib/site-config';
import { sendOwnerNotifications } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { formatWeight, type CourierType } from '@/lib/shipping';
import { ShippingPolicyModal } from '@/components/shipping-policy-modal';

type PaymentMethod = 'advance' | 'full_upi';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const {
    items,
    coupon,
    totals,
    selectedCourier,
    setSelectedCourier,
    pincode,
    setPincode,
    clearCart,
    totalWeightGrams,
    shippingMethods,
    pincodeValid,
    isLocal,
  } = useCart();

  const [showPolicy, setShowPolicy] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('advance');
  const [placing, setPlacing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [newAddr, setNewAddr] = useState({
    name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: pincode || '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/delivery-details');
      return;
    }
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAddresses(data as Address[]);
          const def = data.find((a) => a.is_default) ?? data[0];
          setSelectedAddress(def.id);
        } else {
          setUseNewAddress(true);
        }
      });
  }, [user, navigate]);

  const advanceAmount = Math.round(totals.total * advancePercentage * 100) / 100;
  const balanceAmount = Math.round((totals.total - advanceAmount) * 100) / 100;

  const handlePlaceOrder = async () => {
    if (!user) return;
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      navigate('/print');
      return;
    }

    let shippingAddr: Address | null = null;
    if (!useNewAddress) {
      shippingAddr = addresses.find((a) => a.id === selectedAddress) ?? null;
      if (!shippingAddr) {
        toast.error('Please select a shipping address.');
        return;
      }
    } else {
      if (!newAddr.name || !newAddr.phone || !newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.pincode) {
        toast.error('Please fill in all address fields.');
        return;
      }
    }

    if (!paymentDone) {
      toast.error('Please complete your payment before placing the order.');
      return;
    }

    setPlacing(true);

    try {
      const orderNumber = `PO4U-${Date.now().toString(36).toUpperCase()}`;
      const shippingName = useNewAddress ? newAddr.name : shippingAddr!.name;
      const shippingPhone = useNewAddress ? newAddr.phone : shippingAddr!.phone;
      const shippingAddress = useNewAddress
        ? `${newAddr.line1}${newAddr.line2 ? ', ' + newAddr.line2 : ''}, ${newAddr.city}, ${newAddr.state}`
        : `${shippingAddr!.line1}${shippingAddr!.line2 ? ', ' + shippingAddr!.line2 : ''}, ${shippingAddr!.city}, ${shippingAddr!.state}`;
      const shippingPin = useNewAddress ? newAddr.pincode : shippingAddr!.pincode;

      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          items: items,
          subtotal: totals.subtotal,
          discount: totals.discount,
          coupon_code: coupon?.code ?? null,
          shipping_cost: totals.shippingCost,
          total: totals.total,
          payment_method: paymentMethod,
          payment_status: 'paid',
          order_status: 'placed',
          shipping_name: shippingName,
          shipping_phone: shippingPhone,
          shipping_address: shippingAddress,
          shipping_pincode: shippingPin,
          courier_type: selectedCourier,
        })
        .select()
        .single();

      if (error) throw error;

      const order = data as Order;

      if (useNewAddress) {
        await supabase.from('addresses').insert({
          user_id: user.id,
          label: 'Checkout',
          name: newAddr.name,
          phone: newAddr.phone,
          line1: newAddr.line1,
          line2: newAddr.line2,
          city: newAddr.city,
          state: newAddr.state,
          pincode: newAddr.pincode,
        });
      }

      await supabase.from('order_status_log').insert({
        order_id: order.id,
        status: 'placed',
        note: 'Order placed successfully',
      });

      clearCart();
      toast.success('Order placed successfully!');
      sendOwnerNotifications(order);
      navigate(`/order/success?id=${order.id}`);
    } catch (err) {
      toast.error('Failed to place order. Please try again.');
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center bg-muted/30 px-4">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Your cart is empty</h1>
            <p className="mt-2 text-muted-foreground">Add documents to checkout.</p>
            <Link to="/print" className="mt-6 inline-block">
              <Button>Upload Documents</Button>
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
        <div className="container mx-auto max-w-5xl px-4 lg:px-8">
          <div className="mb-6 flex items-center gap-4">
            <Link to="/cart">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-display text-3xl font-bold">Checkout</h1>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Address */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
                  <MapPin className="h-5 w-5 text-primary" /> Shipping Address
                </h2>

                {addresses.length > 0 && !useNewAddress && (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => setSelectedAddress(addr.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                          selectedAddress === addr.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2',
                            selectedAddress === addr.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border'
                          )}
                        >
                          {selectedAddress === addr.id && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-display text-sm font-semibold">{addr.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {addr.line1}{addr.line2 ? ', ' + addr.line2 : ''}, {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-xs text-muted-foreground">{addr.phone}</p>
                        </div>
                        {addr.is_default && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Default
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => setUseNewAddress(true)}
                      className="w-full rounded-xl border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      + Add a new address
                    </button>
                  </div>
                )}

                {useNewAddress && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={newAddr.name}
                          onChange={(e) => setNewAddr({ ...newAddr, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={newAddr.phone}
                          onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="line1">Address Line 1</Label>
                      <Input
                        id="line1"
                        value={newAddr.line1}
                        onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="line2">Address Line 2 (optional)</Label>
                      <Input
                        id="line2"
                        value={newAddr.line2}
                        onChange={(e) => setNewAddr({ ...newAddr, line2: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={newAddr.city}
                          onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={newAddr.state}
                          onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">PIN Code</Label>
                        <Input
                          id="pincode"
                          value={newAddr.pincode}
                          onChange={(e) =>
                            setNewAddr({ ...newAddr, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })
                          }
                          maxLength={6}
                        />
                      </div>
                    </div>
                    {addresses.length > 0 && (
                      <button
                        onClick={() => setUseNewAddress(false)}
                        className="text-sm text-primary hover:underline"
                      >
                        Use a saved address instead
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Shipping Method Selection */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Truck className="h-5 w-5 text-primary" /> Delivery Method
              </h2>
              <button
                onClick={() => setShowPolicy(true)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Info className="h-3 w-3" /> Shipping Policy
              </button>
            </div>

            {/* Pincode Input */}
            <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
              <Label htmlFor="checkout-pincode" className="mb-2 block">Delivery Pincode</Label>
              <Input
                id="checkout-pincode"
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
                <p className="mt-2 text-xs text-muted-foreground">Enter your pincode to see available delivery options</p>
              )}
            </div>

            {/* Weight Display */}
            {items.length > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
                <Weight className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Calculated Weight:</span>
                <span className="font-semibold text-primary">{formatWeight(totalWeightGrams)}</span>
              </div>
            )}

            {/* Shipping Methods */}
            {pincodeValid ? (
              <div className="space-y-3">
                {shippingMethods.map((method) => {
                  const icon =
                    method.type === 'local' ? Bike :
                    method.type === 'standard' ? Truck :
                    method.type === 'express_air' ? Plane : Store;
                  const Icon = icon;
                  return (
                    <button
                      key={method.type}
                      onClick={() => setSelectedCourier(method.type as CourierType)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                        selectedCourier === method.type
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                          selectedCourier === method.type
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-primary/10 text-primary'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-sm font-semibold">{method.label}</p>
                          {method.freeDelivery && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
                              FREE
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
                      {selectedCourier === method.type && (
                        <Check className="mt-1 h-5 w-5 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                Enter a valid pincode above to see delivery options
              </p>
            )}
          </div>

          {/* Payment Method */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
                  <CreditCard className="h-5 w-5 text-primary" /> Payment Method
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* 50% Advance */}
                  <button
                    onClick={() => { setPaymentMethod('advance'); setPaymentDone(false); setShowQR(false); }}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border-2 p-4 transition-all text-left',
                      paymentMethod === 'advance'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Banknote className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                    <div className="flex-1">
                      <p className="font-display text-sm font-semibold">50% Advance Paid &amp; 50% on Delivery</p>
                      <p className="text-xs text-muted-foreground">Pay {formatINR(advanceAmount)} now, {formatINR(balanceAmount)} on delivery</p>
                    </div>
                    {paymentMethod === 'advance' && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>

                  {/* 100% Full Online */}
                  <button
                    onClick={() => { setPaymentMethod('full_upi'); setPaymentDone(false); setShowQR(false); }}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border-2 p-4 transition-all text-left',
                      paymentMethod === 'full_upi'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Smartphone className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                    <div className="flex-1">
                      <p className="font-display text-sm font-semibold">100% Full Online Payment</p>
                      <p className="text-xs text-muted-foreground">Pay {formatINR(totals.total)} via UPI / QR Code</p>
                    </div>
                    {paymentMethod === 'full_upi' && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                </div>

                {/* Payment action area */}
                <div className="mt-5 rounded-xl border border-border bg-muted/30 p-5">
                  {!showQR && !paymentDone && (
                    <div className="text-center">
                      <p className="mb-1 text-sm font-medium">
                        Amount to pay now:{' '}
                        <span className="font-bold text-primary">
                          {formatINR(paymentMethod === 'advance' ? advanceAmount : totals.total)}
                        </span>
                      </p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        Pay directly via UPI — zero gateway commission
                      </p>
                      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                        <a
                          href={`upi://pay?pa=${encodeURIComponent(siteConfig.payment.upiId)}&pn=${encodeURIComponent(siteConfig.payment.payeeName)}&am=${(paymentMethod === 'advance' ? advanceAmount : totals.total).toFixed(2)}&cu=INR`}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <Smartphone className="h-4 w-4" /> Pay via UPI App
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setShowQR(true)}
                        >
                          <QrCode className="h-4 w-4" /> Show QR Code
                        </Button>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        UPI ID: <span className="font-mono font-medium text-foreground">{siteConfig.payment.upiId}</span>
                      </p>
                    </div>
                  )}

                  {showQR && !paymentDone && (
                    <div className="text-center">
                      <p className="mb-3 text-sm font-medium">Scan this QR code to pay {formatINR(paymentMethod === 'advance' ? advanceAmount : totals.total)}</p>
                      <div className="mx-auto mb-4 flex h-56 w-56 items-center justify-center rounded-xl border-2 border-border bg-white p-3">
                        <img
                          src={siteConfig.payment.qrCodeImage}
                          alt="UPI QR Code"
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="text-center text-xs text-muted-foreground p-4">QR code image not found.<br/>Add your QR image as<br/><span class="font-mono font-medium">public/qr-code.png</span></div>';
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowQR(false)}
                        >
                          Back
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => setPaymentDone(true)}
                        >
                          <Check className="h-4 w-4" /> I've Paid — Confirm Payment
                        </Button>
                      </div>
                    </div>
                  )}

                  {paymentDone && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-semibold">
                        Payment confirmed ({formatINR(paymentMethod === 'advance' ? advanceAmount : totals.total)})
                      </span>
                      <button
                        onClick={() => { setPaymentDone(false); setShowQR(false); }}
                        className="ml-2 text-xs text-muted-foreground hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <div className="sticky top-20 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
                {/* Trust Badge */}
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Pay 50% Now &amp; Pay Rest 50% After Receiving Your Package!
                </div>

                {/* Real-time Weight & Cost Breakdown */}
                <div className="mb-4 space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Weight className="h-4 w-4 text-primary" />
                    Calculated Weight: <span className="text-primary">{formatWeight(totalWeightGrams)}</span>
                  </div>
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
                    <span className="text-muted-foreground">Delivery Fee</span>
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
                        <span>Advance (50%)</span>
                        <span className="font-semibold">{formatINR(advanceAmount)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>On Delivery (50%)</span>
                        <span>{formatINR(balanceAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={placing || !paymentDone}
                  className="mt-4 w-full gap-2"
                  size="lg"
                >
                  {placing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Placing Order...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Place Order
                    </>
                  )}
                </Button>
                {!paymentDone && (
                  <p className="mt-2 text-center text-xs text-amber-600">
                    Complete payment above to enable ordering
                  </p>
                )}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="h-3 w-3" /> Secure checkout • Invoice included
                </p>
                {/* Trust elements */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" /> Tri-Layer Zero-Damage Packaging
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" /> 100% Document Privacy Guaranteed
                  </div>
                  <a
                    href={`https://wa.me/${siteConfig.contact.phoneRaw}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20"
                  >
                    <MessageCircle className="h-4 w-4" /> Chat with us on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <ShippingPolicyModal open={showPolicy} onClose={() => setShowPolicy(false)} />
    </>
  );
}
