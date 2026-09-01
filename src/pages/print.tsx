import { useState, useCallback, useMemo } from 'react';
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
  Loader2,
  ShieldCheck,
  Mail,
  Lock,
  User,
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
  const { user, profile, signInWithEmail, signUpWithEmail } = useAuth();
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

  // Auth state (inline email/password for step 3 gate)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullName, setFullName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [options, setOptions] = useState({
    printType: 'bw' as 'bw' | 'color',
    side: 'single' as 'single' | 'double',
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

  // Auth handler
  const handleAuthSubmit = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setAuthBusy(true);
    if (authMode === 'signup') {
      if (!fullName.trim()) {
        toast.error('Please enter your name.');
        setAuthBusy(false);
        return;
      }
      const { error } = await signUpWithEmail(emailInput, passwordInput, fullName.trim());
      setAuthBusy(false);
      if (error) { toast.error(error); return; }
      toast.success('Account created! Welcome to Online Print 4U.');
    } else {
      const { error } = await signInWithEmail(emailInput, passwordInput);
      setAuthBusy(false);
      if (error) { toast.error(error); return; }
      toast.success('Login successful!');
    }
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
                  {/* Print Type */}
                  <div>
                    <Label className="mb-2 block">Print Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'bw', label: 'Black & White', desc: `Starts at ${formatINR(RATE_CARD[0].bwSingle)}/page` },
                        { key: 'color', label: 'Color', desc: `Starts at ${formatINR(RATE_CARD[0].colorDouble)}/page` },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setOptions({ ...options, printType: opt.key as 'bw' | 'color' })}
                          className={cn(
                            'rounded-xl border-2 p-4 text-left transition-all',
                            options.printType === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          )}
                        >
                          <p className="font-display text-sm font-semibold">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Side */}
                  <div>
                    <Label className="mb-2 block">Print Side</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'single', label: 'Single Side' },
                        { key: 'double', label: 'Double Side', desc: 'Save 50%' },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setOptions({ ...options, side: opt.key as 'single' | 'double' })}
                          className={cn(
                            'rounded-xl border-2 p-4 text-left transition-all',
                            options.side === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          )}
                        >
                          <p className="font-display text-sm font-semibold">{opt.label}</p>
                          {opt.desc && <p className="text-xs text-emerald-600">{opt.desc}</p>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Print Orientation */}
                  <div>
                    <Label className="mb-2 block">Print Orientation</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'portrait', label: 'Portrait', desc: 'Vertical (default)' },
                        { key: 'landscape', label: 'Landscape', desc: 'Horizontal' },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setOptions({ ...options, orientation: opt.key as 'portrait' | 'landscape' })}
                          className={cn(
                            'rounded-xl border-2 p-4 text-left transition-all',
                            options.orientation === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          )}
                        >
                          <p className="font-display text-sm font-semibold">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </button>
                      ))}
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
                      <Label className="mb-2 block">Paper GSM</Label>
                      <div className="flex flex-wrap gap-2">
                        {PAPER_GSM_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setOptions({ ...options, paperGsm: opt.value })}
                            className={cn(
                              'rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all',
                              options.paperGsm === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Binding */}
                  <div>
                    <Label className="mb-2 block">Binding</Label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {BINDING_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setOptions({ ...options, binding: opt.key })}
                          className={cn(
                            'rounded-xl border-2 p-3 text-center transition-all',
                            options.binding === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          )}
                        >
                          <p className="font-display text-sm font-semibold">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.priceLabel}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lamination */}
                  <div>
                    <Label className="mb-2 block">Lamination</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'none', label: 'No Lamination' },
                        { key: 'transparent', label: 'Transparent Cover' },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => setOptions({ ...options, lamination: opt.key as 'none' | 'transparent' })}
                          className={cn(
                            'rounded-xl border-2 p-4 text-left transition-all',
                            options.lamination === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          )}
                        >
                          <p className="font-display text-sm font-semibold">{opt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Premium Photo */}
                  <div>
                    <Label className="mb-2 block">Premium Photo Prints</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: false, label: 'Standard', desc: 'Regular print quality' },
                        { key: true, label: 'Premium Photo', desc: '₹25/page glossy' },
                      ].map((opt) => (
                        <button
                          key={String(opt.key)}
                          onClick={() => setOptions({ ...options, premiumPhoto: opt.key })}
                          className={cn(
                            'rounded-xl border-2 p-4 text-left transition-all',
                            options.premiumPhoto === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          )}
                        >
                          <p className="font-display text-sm font-semibold">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
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
                    Please sign in or create an account to continue with the order.
                  </p>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAuthMode('signin')}
                        className={cn(
                          'flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all',
                          authMode === 'signin' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        )}
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => setAuthMode('signup')}
                        className={cn(
                          'flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all',
                          authMode === 'signup' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        )}
                      >
                        Sign Up
                      </button>
                    </div>

                    {authMode === 'signup' && (
                      <div className="space-y-2">
                        <Label htmlFor="print-auth-name">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="print-auth-name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="print-auth-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="print-auth-email"
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="you@example.com"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="print-auth-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="print-auth-password"
                          type="password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="At least 6 characters"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleAuthSubmit}
                      disabled={authBusy}
                      className="w-full gap-2"
                    >
                      {authBusy ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> {authMode === 'signup' ? 'Creating account...' : 'Signing in...'}</>
                      ) : (
                        <>{authMode === 'signup' ? 'Create Account' : 'Sign In'} <ArrowRight className="h-4 w-4" /></>
                      )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                      <button
                        onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                        className="text-primary hover:underline"
                      >
                        {authMode === 'signin' ? 'Sign up' : 'Sign in'}
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {/* Logged-in confirmation */}
              {user && (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-700">
                      Authenticated as {profile?.full_name || user.displayName || 'User'}
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
