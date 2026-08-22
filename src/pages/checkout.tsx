import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Check,
  Loader2,
  Truck,
  ShieldCheck,
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
  Lock,
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured, type Address, type Order } from '@/lib/supabase';
import { formatINR } from '@/lib/pricing';
import { siteConfig, advancePercentage } from '@/lib/site-config';
import { cn } from '@/lib/utils';
import { formatWeight, type CourierType } from '@/lib/shipping';
import { ShippingPolicyModal } from '@/components/shipping-policy-modal';
import { initiateRazorpayPayment, isRazorpayConfigured } from '@/lib/razorpay';

type PaymentMethod = 'advance' | 'full_upi';

type CheckoutSection = 'auth' | 'address' | 'delivery' | 'payment' | 'review';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, profile, sendPhoneOtp, verifyPhoneOtp } = useAuth();
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

  // --- Auth state (embedded phone OTP) ---
  const [authStep, setAuthStep] = useState<'phone' | 'otp' | 'done'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [authBusy, setAuthBusy] = useState(false);

  // --- Address state ---
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({
    name: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // --- Payment state ---
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('advance');
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [razorpayPaymentId, setRazorpayPaymentId] = useState<string | null>(null);

  // --- Order placement ---
  const [placing, setPlacing] = useState(false);

  const advanceAmount = Math.round(totals.total * advancePercentage * 100) / 100;
  const balanceAmount = Math.round((totals.total - advanceAmount) * 100) / 100;
  const amountToPayNow = paymentMethod === 'advance' ? advanceAmount : totals.total;

  // Determine the active section based on completion state
  const activeSection: CheckoutSection = !user
    ? 'auth'
    : !isAddressComplete()
    ? 'address'
    : !selectedCourier
    ? 'delivery'
    : !paymentDone
    ? 'payment'
    : 'review';

  function isAddressComplete(): boolean {
    if (useNewAddress) {
      return Boolean(
        newAddr.name && newAddr.phone && newAddr.line1 && newAddr.city && newAddr.state && newAddr.pincode
      );
    }
    return Boolean(selectedAddress);
  }

  // --- OTP timer ---
  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpTimer]);

  // --- Load addresses when user is available ---
  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured) {
      setUseNewAddress(true);
      return;
    }
    // Fetch saved addresses from Supabase (RLS allows user to see own)
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.uid)
      .order('is_default', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) {
          setUseNewAddress(true);
          return;
        }
        if (data.length > 0) {
          setAddresses(data as Address[]);
          const def = data.find((a) => a.is_default) ?? data[0];
          if (def) setSelectedAddress(def.id);
          else setUseNewAddress(true);
        } else {
          setUseNewAddress(true);
        }
      })
      .catch(() => setUseNewAddress(true));
    // Pre-fill name/phone/email from profile
    if (profile) {
      setNewAddr((prev) => ({
        ...prev,
        name: profile.full_name || prev.name,
        phone: profile.phone || prev.phone,
        email: profile.email || prev.email,
      }));
    }
  }, [user, profile]);

  // --- Auto-scroll to active section ---
  const sectionRefs: Record<CheckoutSection, HTMLElement | null> = {
    auth: null,
    address: null,
    delivery: null,
    payment: null,
    review: null,
  };

  // --- Phone OTP handlers ---
  const handleSendOtp = async () => {
    const cleaned = phoneInput.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }
    setAuthBusy(true);
    const { error } = await sendPhoneOtp(cleaned, 'checkout-recaptcha-container');
    setAuthBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    setOtpSent(true);
    setAuthStep('otp');
    setOtpTimer(30);
    toast.success('OTP sent to +91 ' + cleaned);
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      toast.error('Enter the 6-digit OTP.');
      return;
    }
    setAuthBusy(true);
    const { error } = await verifyPhoneOtp(otpInput);
    setAuthBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    setAuthStep('done');
    toast.success('Login successful!');
  };

  // --- Razorpay payment handler ---
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
      description: paymentMethod === 'advance'
        ? `50% Advance Payment — Order Total: ${formatINR(totals.total)}`
        : `Full Payment — Order Total: ${formatINR(totals.total)}`,
      prefill: {
        name: profile?.full_name || fullName || '',
        email: profile?.email || emailInput || newAddr.email || '',
        contact: profile?.phone || phoneInput || newAddr.phone || '',
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

  // --- Place order ---
  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Please log in first.');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      navigate('/print');
      return;
    }

    // Validate address
    let shippingName: string, shippingPhone: string, shippingEmail: string, shippingAddress: string, shippingPin: string;
    if (useNewAddress) {
      if (!newAddr.name || !newAddr.phone || !newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.pincode) {
        toast.error('Please fill in all address fields.');
        return;
      }
      shippingName = newAddr.name;
      shippingPhone = newAddr.phone;
      shippingEmail = newAddr.email || emailInput || '';
      shippingAddress = `${newAddr.line1}${newAddr.line2 ? ', ' + newAddr.line2 : ''}, ${newAddr.city}, ${newAddr.state}`;
      shippingPin = newAddr.pincode;
    } else {
      const addr = addresses.find((a) => a.id === selectedAddress);
      if (!addr) {
        toast.error('Please select a shipping address.');
        return;
      }
      shippingName = addr.name;
      shippingPhone = addr.phone;
      shippingEmail = addr.email || emailInput || '';
      shippingAddress = `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.city}, ${addr.state}`;
      shippingPin = addr.pincode;
    }

    if (!paymentDone || !razorpayPaymentId) {
      toast.error('Please complete your payment before placing the order.');
      return;
    }

    setPlacing(true);

    try {
      const orderNumber = `PO4U-${Date.now().toString(36).toUpperCase()}`;

      // Determine delivery type label
      const deliveryLabel =
        shippingMethods.find((m) => m.type === selectedCourier)?.label ?? selectedCourier;

      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: user.uid,
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
          delivery_type_label: deliveryLabel,
          payment_screenshot_url: null,
          customer_email: shippingEmail || emailInput || null,
          notes: `Razorpay Payment ID: ${razorpayPaymentId}`,
        })
        .select()
        .single();

      if (error) throw error;

      const order = data as Order;

      // Save address to Supabase for future use
      if (useNewAddress) {
        const newAddrRecord = {
          id: crypto.randomUUID(),
          user_id: user.uid,
          label: 'Checkout',
          name: newAddr.name,
          phone: newAddr.phone,
          email: newAddr.email || null,
          line1: newAddr.line1,
          line2: newAddr.line2 || null,
          house_flat: null,
          street_area: null,
          landmark: null,
          city: newAddr.city,
          state: newAddr.state,
          pincode: newAddr.pincode,
          is_default: addresses.length === 0,
        };
        try {
          await supabase.from('addresses').insert(newAddrRecord);
        } catch {
          // Non-blocking
        }
      }

      // Insert status log
      try {
        await supabase.from('order_status_log').insert({
          order_id: order.id,
          status: 'placed',
          note: 'Order placed successfully',
        });
      } catch {
        // Non-blocking
      }

      // Send notifications (best-effort) via edge function
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
        await fetch(`${supabaseUrl}/functions/v1/notify-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            order: {
              order_number: order.order_number,
              created_at: order.created_at,
              shipping_name: order.shipping_name,
              shipping_phone: order.shipping_phone,
              shipping_address: order.shipping_address,
              shipping_pincode: order.shipping_pincode,
              customer_email: order.customer_email,
              items: order.items,
              subtotal: order.subtotal,
              discount: order.discount,
              coupon_code: order.coupon_code,
              shipping_cost: order.shipping_cost,
              total: order.total,
              payment_method: order.payment_method,
              payment_status: order.payment_status,
              notes: order.notes,
            },
            ownerEmail: 'contact@onlineprint4u.in',
            ownerWhatsApp: '917858093865',
          }),
        });
      } catch {
        // Non-blocking
      }

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order/success?id=${order.id}`);
    } catch {
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
        <div className="container mx-auto max-w-4xl px-4 lg:px-8">
          <div className="mb-6 flex items-center gap-4">
            <Link to="/cart">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-display text-3xl font-bold">Checkout</h1>
          </div>

          <div className="space-y-6">
            {/* ============ SECTION 1: AUTHENTICATION (Phone OTP) ============ */}
            <section
              ref={(el) => { sectionRefs.auth = el; }}
              className={cn(
                'rounded-2xl border-2 bg-card p-6 shadow-sm transition-all',
                activeSection === 'auth' ? 'border-primary' : 'border-border'
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  user ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
                )}>
                  {user ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <h2 className="font-display text-lg font-bold">Login / Signup</h2>
                {user && (
                  <span className="ml-auto rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
                    Logged in as {user.phoneNumber || user.email}
                  </span>
                )}
              </div>

              {!user && (
                <div className="space-y-4">
                  {authStep === 'phone' && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="auth-phone">Mobile Number</Label>
                          <div className="flex items-center gap-2">
                            <span className="flex h-10 items-center rounded-lg border border-border bg-muted/50 px-3 text-sm font-medium text-muted-foreground">
                              +91
                            </span>
                            <Input
                              id="auth-phone"
                              value={phoneInput}
                              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="10-digit mobile number"
                              maxLength={10}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="auth-name">Full Name (optional)</Label>
                          <Input
                            id="auth-name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your name"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleSendOtp}
                        disabled={authBusy || phoneInput.length !== 10}
                        className="w-full gap-2"
                      >
                        {authBusy ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</>
                        ) : (
                          <><Smartphone className="h-4 w-4" /> Send OTP</>
                        )}
                      </Button>
                    </>
                  )}

                  {authStep === 'otp' && (
                    <>
                      <div className="rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
                        Enter the 6-digit OTP sent to <span className="font-semibold text-foreground">+91 {phoneInput}</span>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="auth-otp">Enter OTP</Label>
                        <Input
                          id="auth-otp"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="6-digit code"
                          maxLength={6}
                          className="text-center text-lg tracking-widest"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => { setAuthStep('phone'); setOtpSent(false); setOtpInput(''); }}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Change number
                        </button>
                        <button
                          onClick={otpTimer === 0 ? handleSendOtp : undefined}
                          disabled={otpTimer > 0}
                          className="text-sm text-primary hover:underline disabled:opacity-50"
                        >
                          {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
                        </button>
                      </div>
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={authBusy || otpInput.length !== 6}
                        className="w-full gap-2"
                      >
                        {authBusy ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                        ) : (
                          <><Check className="h-4 w-4" /> Verify & Login</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Hidden reCAPTCHA container for Firebase Phone Auth */}
              {!user && <div id="checkout-recaptcha-container" className="min-h-[1px]" />}

              {user && (
                <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-700">
                      Authenticated as {profile?.full_name || user.displayName || 'User'}
                    </p>
                    <p className="text-xs text-emerald-600">{user.phoneNumber || user.email}</p>
                  </div>
                </div>
              )}
            </section>

            {/* ============ SECTION 2: DELIVERY ADDRESS ============ */}
            <section
              ref={(el) => { sectionRefs.address = el; }}
              className={cn(
                'rounded-2xl border-2 bg-card p-6 shadow-sm transition-all',
                activeSection === 'address' ? 'border-primary' : 'border-border',
                !user && 'opacity-50 pointer-events-none'
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  isAddressComplete() ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
                )}>
                  {isAddressComplete() ? <Check className="h-4 w-4" /> : '2'}
                </div>
                <h2 className="font-display text-lg font-bold">Delivery Address</h2>
              </div>

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
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={newAddr.phone}
                        onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email ID</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAddr.email}
                      onChange={(e) => setNewAddr({ ...newAddr, email: e.target.value })}
                      placeholder="For order confirmation email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line1">Address Line 1</Label>
                    <Input
                      id="line1"
                      value={newAddr.line1}
                      onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                      placeholder="House / Flat number, Building name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line2">Address Line 2 (optional)</Label>
                    <Input
                      id="line2"
                      value={newAddr.line2}
                      onChange={(e) => setNewAddr({ ...newAddr, line2: e.target.value })}
                      placeholder="Street, Area, Landmark"
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
            </section>

            {/* ============ SECTION 3: DELIVERY METHOD (Unified 4 options) ============ */}
            <section
              ref={(el) => { sectionRefs.delivery = el; }}
              className={cn(
                'rounded-2xl border-2 bg-card p-6 shadow-sm transition-all',
                activeSection === 'delivery' ? 'border-primary' : 'border-border',
                !user && 'opacity-50 pointer-events-none'
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  selectedCourier ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
                )}>
                  {selectedCourier ? <Check className="h-4 w-4" /> : '3'}
                </div>
                <h2 className="font-display text-lg font-bold">Select Delivery Method</h2>
                <button
                  onClick={() => setShowPolicy(true)}
                  className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Info className="h-3 w-3" /> Shipping Policy
                </button>
              </div>

              {/* Weight Display */}
              {items.length > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
                  <Weight className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Calculated Weight:</span>
                  <span className="font-semibold text-primary">{formatWeight(totalWeightGrams)}</span>
                </div>
              )}

              {/* Pincode input (only needed for non-pickup options) */}
              <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4">
                <Label htmlFor="checkout-pincode" className="mb-2 block">Delivery Pincode (not needed for Store Pickup)</Label>
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
                  <p className="mt-2 text-xs text-muted-foreground">Enter your pincode to see delivery options</p>
                )}
              </div>

              {/* All 4 Delivery Options — always visible */}
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
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-primary/10 text-primary'
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
                      {isSelected && (
                        <Check className="mt-1 h-5 w-5 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ============ SECTION 4: PAYMENT METHOD ============ */}
            <section
              ref={(el) => { sectionRefs.payment = el; }}
              className={cn(
                'rounded-2xl border-2 bg-card p-6 shadow-sm transition-all',
                activeSection === 'payment' ? 'border-primary' : 'border-border',
                (!user || !selectedCourier) && 'opacity-50 pointer-events-none'
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  paymentDone ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
                )}>
                  {paymentDone ? <Check className="h-4 w-4" /> : '4'}
                </div>
                <h2 className="font-display text-lg font-bold">Payment Method</h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* 50% Advance + 50% COD */}
                <button
                  onClick={() => { setPaymentMethod('advance'); setPaymentDone(false); setRazorpayPaymentId(null); }}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border-2 p-4 transition-all text-left',
                    paymentMethod === 'advance'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Banknote className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="font-display text-sm font-semibold">50% Advance + 50% on Delivery</p>
                    <p className="text-xs text-muted-foreground">Pay {formatINR(advanceAmount)} now, {formatINR(balanceAmount)} on delivery</p>
                  </div>
                  {paymentMethod === 'advance' && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>

                {/* 100% Full Online Payment */}
                <button
                  onClick={() => { setPaymentMethod('full_upi'); setPaymentDone(false); setRazorpayPaymentId(null); }}
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
                    <p className="text-xs text-muted-foreground">Pay {formatINR(totals.total)} via UPI / Card / Net Banking</p>
                  </div>
                  {paymentMethod === 'full_upi' && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </button>
              </div>

              {/* Payment action area */}
              <div className="mt-5 rounded-xl border border-border bg-muted/30 p-5">
                {!paymentDone && (
                  <div className="text-center">
                    <p className="mb-1 text-sm font-medium">
                      Amount to pay now:{' '}
                      <span className="font-bold text-primary">
                        {formatINR(amountToPayNow)}
                      </span>
                    </p>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Secure payment via Razorpay — UPI, Cards, Net Banking &amp; Wallets
                    </p>
                    <Button
                      onClick={handleRazorpayPayment}
                      disabled={paymentProcessing || !user || !selectedCourier}
                      className="gap-2"
                      size="lg"
                    >
                      {paymentProcessing ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                      ) : (
                        <><CreditCard className="h-4 w-4" /> Pay {formatINR(amountToPayNow)} Now</>
                      )}
                    </Button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" /> 100% Secure &amp; Encrypted Payment
                    </p>
                  </div>
                )}

                {paymentDone && (
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      Payment confirmed ({formatINR(amountToPayNow)})
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ID: {razorpayPaymentId?.slice(0, 14)}...
                    </span>
                    <button
                      onClick={() => { setPaymentDone(false); setRazorpayPaymentId(null); }}
                      className="ml-2 text-xs text-muted-foreground hover:underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ============ ORDER SUMMARY (Sticky at bottom) ============ */}
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
              {/* Trust Badge */}
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Pay 50% Now &amp; Pay Rest 50% After Receiving Your Package!
              </div>

              {/* Weight & Cost Breakdown */}
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
                  <span className="text-muted-foreground">
                    Delivery Fee{selectedCourier && shippingMethods.find(m => m.type === selectedCourier) ? ` (${shippingMethods.find(m => m.type === selectedCourier)?.label})` : ''}
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

              <Button
                onClick={handlePlaceOrder}
                disabled={placing || !paymentDone || !user || !selectedCourier}
                className="mt-4 w-full gap-2"
                size="lg"
              >
                {placing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Placing Order...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Confirm &amp; Place Order
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
      </main>
      <Footer />
      <ShippingPolicyModal open={showPolicy} onClose={() => setShowPolicy(false)} />
    </>
  );
}
