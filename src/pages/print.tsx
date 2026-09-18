import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Settings2,
  Truck,
  CreditCard,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Calculator,
  Check,
  Loader2,
  ShieldCheck,
  Mail,
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
import {
  calculateItemPriceLocal,
  formatINR,
  PAPER_GSM_OPTIONS,
  PAPER_SIZE_OPTIONS,
  BINDING_OPTIONS,
  RATE_CARD,
  getPrintRateLocal,
} from '@/lib/pricing';
import type { OrderItem, PaperGsm } from '@/lib/database';
import { cn } from '@/lib/utils';
import { FileUploader, type UploadedFile } from '@/components/print/file-uploader';
import { StepAddress, type AddressData } from '@/components/print/step-address';
import { StepShipping } from '@/components/print/step-shipping';
import { StepPayment } from '@/components/print/step-payment';

const steps = [
  { num: 1, icon: Upload, label: 'Upload' },
  { num: 2, icon: Settings2, label: 'Options' },
  { num: 3, icon: MapPin, label: 'Address' },
  { num: 4, icon: Truck, label: 'Shipping' },
  { num: 5, icon: CreditCard, label: 'Checkout' },
];

export default function PrintPage() {
  const navigate = useNavigate();
  const { user, profile, sendEmailOtp, verifyEmailOtp, otpSending } = useAuth();
  const { addItem, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [addressData, setAddressData] = useState<AddressData>({
    name: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Auth state (inline OTP for step 3 gate)
  const [authStep, setAuthStep] = useState<'credentials' | 'otp' | 'done'>('credentials');
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [authBusy, setAuthBusy] = useState(false);

  const [options, setOptions] = useState({
    printType: 'bw' as 'bw' | 'color',
    pageSize: 'A4',
    side: 'double' as 'single' | 'double',
    orientation: 'portrait' as 'portrait' | 'landscape',
    paperGsm: '75' as PaperGsm,
    binding: 'none' as OrderItem['binding'],
    lamination: 'none' as 'none' | 'transparent',
    premiumPhoto: false,
    copies: 1,
    notes: '',
  });

  const priceBreakdown = useMemo(() => {
    const totalPages = files.reduce((sum, f) => sum + f.pages, 0);
    if (totalPages === 0) {
      return { printingCost: 0, bindingCost: 0, photoCost: 0, laminationCost: 0, itemTotal: 0, perPageRate: 0, totalPages: 0 };
    }
    const mockItem = {
      id: 'preview',
      fileName: 'preview',
      fileType: 'pdf',
      fileSize: 0,
      pages: totalPages,
      copies: options.copies,
      printType: options.printType,
      side: options.side,
      orientation: options.orientation,
      paperGsm: options.paperGsm,
      binding: options.binding,
      lamination: options.lamination,
      premiumPhoto: options.premiumPhoto,
      notes: options.notes,
    };
    const { printingCost, bindingCost, photoCost, laminationCost, itemTotal } = calculateItemPriceLocal(mockItem);
    const perPageRate = getPrintRateLocal(options.paperGsm, options.printType, options.side);
    return {
      printingCost: Math.round(printingCost * 100) / 100,
      bindingCost: Math.round(bindingCost * 100) / 100,
      photoCost: Math.round(photoCost * 100) / 100,
      laminationCost: Math.round(laminationCost * 100) / 100,
      itemTotal: Math.round(itemTotal * 100) / 100,
      perPageRate,
      totalPages,
    };
  }, [files, options]);

  const itemPrice = priceBreakdown.itemTotal;

  const handleAddFiles = useCallback((newFiles: UploadedFile[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleReorderFiles = useCallback((reordered: UploadedFile[]) => {
    setFiles(reordered);
  }, []);

  // Add files to cart and proceed to address step
  const proceedToAddress = () => {
    clearCart();
    files.forEach((file) => {
      const fileItem = {
        id: file.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        pages: file.pages,
        copies: options.copies,
        printType: options.printType,
        side: options.side,
        orientation: options.orientation,
        paperGsm: options.paperGsm,
        binding: options.binding,
        lamination: options.lamination,
        premiumPhoto: options.premiumPhoto,
        notes: options.notes,
      };
      const { itemTotal: fileTotal } = calculateItemPriceLocal(fileItem);
      const item: OrderItem = {
        ...fileItem,
        price: Math.round(fileTotal * 100) / 100,
      };
      addItem(item, file.file);
    });
    setStep(3);
  };

  // OTP timer
  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpTimer]);

  const handleSendOtp = async () => {
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setAuthBusy(true);
    const { error } = await sendEmailOtp(emailInput);
    setAuthBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    setAuthStep('otp');
    setOtpTimer(30);
    toast.success('Verification code sent to your email.');
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      toast.error('Enter the 6-digit OTP.');
      return;
    }
    setAuthBusy(true);
    const { error } = await verifyEmailOtp(emailInput, otpInput);
    setAuthBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    setAuthStep('done');
    toast.success('Login successful!');
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-10">
        <div className="container mx-auto max-w-5xl px-4 lg:px-8">
          {/* Stepper */}
          <div className="mb-8 flex items-center justify-center gap-2 sm:gap-4">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2 sm:gap-4">
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('h-px w-8 sm:w-16', step > s.num ? 'bg-primary' : 'bg-border')} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="animate-fade-in rounded-3xl border border-border bg-card p-8 shadow-sm">
              <h1 className="mb-2 font-display text-2xl font-bold">Upload your documents</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Drag &amp; drop or browse to upload. We support PDF, DOCX, PPTX, JPG, and PNG.
              </p>
              <FileUploader
                files={files}
                onAdd={handleAddFiles}
                onRemove={handleRemoveFile}
                onReorder={handleReorderFiles}
              />
              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => navigate('/')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => {
                    if (files.length === 0) {
                      toast.error('Please upload at least one document.');
                      return;
                    }
                    setStep(2);
                  }}
                >
                  Next: Print Options <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Print Options */}
          {step === 2 && (
            <div className="animate-fade-in space-y-6">
              <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                <h1 className="mb-2 font-display text-2xl font-bold">Customize print options</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                  Choose your printing preferences. Prices update instantly.
                </p>

                <div className="space-y-6">
                  {/* Print Type + Page Size */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-2 block">Print Type</Label>
                      <select
                        value={options.printType}
                        onChange={(e) => setOptions({ ...options, printType: e.target.value as 'bw' | 'color' })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="bw">Black & White (B&W)</option>
                        <option value="color">Color</option>
                      </select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {options.printType === 'bw'
                          ? `Starts at ${formatINR(RATE_CARD[0].bwSingle)}/page`
                          : `Starts at ${formatINR(RATE_CARD[0].colorDouble)}/page`}
                      </p>
                    </div>
                    <div>
                      <Label className="mb-2 block">Page Size</Label>
                      <select
                        value={options.pageSize}
                        onChange={(e) => setOptions({ ...options, pageSize: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {PAPER_SIZE_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Side + Orientation */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-2 block">Print Side</Label>
                      <select
                        value={options.side}
                        onChange={(e) => setOptions({ ...options, side: e.target.value as 'single' | 'double' })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="double">Double Side (Back-to-Back / Both Sided)</option>
                        <option value="single">Single Side (One Sided)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="mb-2 block">Print Orientation</Label>
                      <select
                        value={options.orientation}
                        onChange={(e) => setOptions({ ...options, orientation: e.target.value as 'portrait' | 'landscape' })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="portrait">Portrait (Vertical)</option>
                        <option value="landscape">Landscape (Horizontal)</option>
                      </select>
                    </div>
                  </div>

                  {/* Copies + GSM */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-2 block">Copies</Label>
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={options.copies}
                        onChange={(e) =>
                          setOptions({ ...options, copies: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Paper Type (GSM)</Label>
                      <select
                        value={options.paperGsm}
                        onChange={(e) => setOptions({ ...options, paperGsm: e.target.value as PaperGsm })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {PAPER_GSM_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Binding + Lamination */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-2 block">Binding / Staple Type</Label>
                      <select
                        value={options.binding}
                        onChange={(e) => setOptions({ ...options, binding: e.target.value as OrderItem['binding'] })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {BINDING_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label} {opt.key !== 'none' ? `(${opt.priceLabel})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="mb-2 block">Lamination</Label>
                      <select
                        value={options.lamination}
                        onChange={(e) => setOptions({ ...options, lamination: e.target.value as 'none' | 'transparent' })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="none">No Lamination</option>
                        <option value="transparent">Transparent Cover (₹5/page)</option>
                      </select>
                    </div>
                  </div>

                  {/* Premium Photo */}
                  <div>
                    <Label className="mb-2 block">Premium Photo Prints</Label>
                    <select
                      value={options.premiumPhoto ? 'true' : 'false'}
                      onChange={(e) => setOptions({ ...options, premiumPhoto: e.target.value === 'true' })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="false">Standard — Regular print quality</option>
                      <option value="true">Premium Photo — ₹25/page glossy</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="mb-2 block">Custom Notes (optional)</Label>
                    <Textarea
                      value={options.notes}
                      onChange={(e) => setOptions({ ...options, notes: e.target.value })}
                      placeholder="Any special instructions for printing..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Live Price Card */}
              <div className="sticky bottom-4 z-10 rounded-2xl border border-primary/20 bg-card p-5 shadow-glow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Calculator className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated Total</p>
                      <p className="font-display text-2xl font-bold text-primary">{formatINR(itemPrice)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={proceedToAddress}>
                      Next: Address <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Address (with inline auth gate) */}
          {step === 3 && (
            <div className="animate-fade-in space-y-6">
              {/* Auth gate — shown if not logged in */}
              {!user && (
                <div className="rounded-3xl border-2 border-primary bg-card p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      !
                    </div>
                    <h2 className="font-display text-lg font-bold">Login Required</h2>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Verify your email to continue with the order.
                  </p>

                  {authStep === 'credentials' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="auth-email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="auth-email"
                            type="email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="you@example.com"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleSendOtp}
                        disabled={authBusy || otpSending || !emailInput}
                        className="w-full gap-2"
                      >
                        {authBusy || otpSending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Sending code...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" /> Send Verification Code
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {authStep === 'otp' && (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
                        Enter the 6-digit code sent to{' '}
                        <span className="font-semibold text-foreground">
                          {emailInput}
                        </span>
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
                          onClick={() => {
                            setAuthStep('credentials');
                            setOtpInput('');
                          }}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          Change email
                        </button>
                        <button
                          onClick={otpTimer === 0 ? handleSendOtp : undefined}
                          disabled={otpTimer > 0 || otpSending}
                          className="text-sm text-primary hover:underline disabled:opacity-50"
                        >
                          {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend code'}
                        </button>
                      </div>
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={authBusy || otpInput.length !== 6}
                        className="w-full gap-2"
                      >
                        {authBusy ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" /> Verify & Login
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                </div>
              )}

              {/* Logged-in confirmation */}
              {user && (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-700">
                      Authenticated as {profile?.full_name || user.displayName || 'Verified Customer'}
                    </p>
                    <p className="text-xs text-emerald-600">{user.phoneNumber || user.email}</p>
                  </div>
                </div>
              )}

              {/* Address form — always shown, fresh for every order */}
              <StepAddress
                initial={addressData}
                onBack={() => setStep(2)}
                onNext={(data) => {
                  setAddressData(data);
                  setStep(4);
                }}
              />
            </div>
          )}

          {/* Step 4: Shipping + Coupon */}
          {step === 4 && (
            <StepShipping onBack={() => setStep(3)} onNext={() => setStep(5)} />
          )}

          {/* Step 5: Final Checkout + Payment */}
          {step === 5 && (
            <StepPayment address={addressData} onBack={() => setStep(4)} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
