import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Phone,
  Mail,
  ShieldCheck,
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  LogIn,
  UserPlus,
  Timer,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useCountdown } from '@/lib/use-countdown';
import { cn } from '@/lib/utils';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
};

type AuthMethod = 'phone' | 'email';
type Step = 'credentials' | 'otp';

const RECAPTCHA_CONTAINER_ID = 'firebase-recaptcha-container';

export function HeaderAuthModal({ open, onClose, mode }: AuthModalProps) {
  const { sendPhoneOtp, verifyPhoneOtp, signInWithEmail, signUpWithEmail, otpSending } = useAuth();
  const { secondsLeft, isCoolingDown, startCooldown } = useCountdown();
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [step, setStep] = useState<Step>('credentials');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStep('credentials');
      setOtp('');
      setLoading(false);
      const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
      if (container) container.innerHTML = '';
    }
  }, [open]);

  const phoneValid = /^\d{10}$/.test(phone);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  const switchMethod = (m: AuthMethod) => {
    setMethod(m);
    setStep('credentials');
    setOtp('');
  };

  const handleEmailSubmit = useCallback(async () => {
    if (mode === 'signup' && !name.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!emailValid) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!passwordValid) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } =
      mode === 'signup'
        ? await signUpWithEmail(email, password, name)
        : await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(mode === 'signup' ? 'Account created! Welcome to Online Print 4U.' : 'Welcome back!');
    onClose();
  }, [mode, email, emailValid, password, passwordValid, name, signInWithEmail, signUpWithEmail, onClose]);

  const handleSendOtp = useCallback(async () => {
    if (mode === 'signup' && !name.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (!phoneValid) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    const { error, cooldownSec } = await sendPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
    setLoading(false);
    if (error) {
      toast.error(error);
      if (cooldownSec) startCooldown(cooldownSec);
      return;
    }
    toast.success(`OTP sent to +91 ${phone}`);
    setStep('otp');
  }, [mode, phone, phoneValid, name, sendPhoneOtp, startCooldown]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    const { error } = await verifyPhoneOtp(otp);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(mode === 'signup' ? 'Account created! Welcome to Online Print 4U.' : 'Welcome back!');
    onClose();
  }, [otp, verifyPhoneOtp, mode, onClose]);

  const handleResendOtp = useCallback(async () => {
    if (isCoolingDown) return;
    if (!phoneValid) return;
    setLoading(true);
    const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
    if (container) container.innerHTML = '';
    const { error, cooldownSec } = await sendPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
    setLoading(false);
    if (error) {
      toast.error(error);
      if (cooldownSec) startCooldown(cooldownSec);
      return;
    }
    toast.success('New OTP sent to +91 ' + phone);
  }, [phone, phoneValid, sendPhoneOtp, isCoolingDown, startCooldown]);

  if (!open) return null;

  const isSignup = mode === 'signup';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
        style={{ animation: 'modal-scale-in 0.25s ease-out' }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl',
            isSignup ? 'bg-primary/10' : 'bg-emerald-500/10'
          )}>
            {isSignup ? <UserPlus className="h-6 w-6 text-primary" /> : <LogIn className="h-6 w-6 text-emerald-600" />}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">
              {isSignup ? 'Create your account' : 'Sign in to your account'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignup ? 'Join Online Print 4U in seconds' : 'Welcome back to Online Print 4U'}
            </p>
          </div>
        </div>

        {/* Phone / Email tab switcher */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            onClick={() => switchMethod('phone')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
              method === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Phone className="h-4 w-4" /> Phone
          </button>
          <button
            onClick={() => switchMethod('email')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
              method === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
        </div>

        {/* Email mode — password-based */}
        {method === 'email' && (
          <div className="animate-fade-in space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              className="w-full gap-2"
              disabled={loading || !emailValid || !passwordValid || (isSignup && !name.trim())}
              onClick={handleEmailSubmit}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {isSignup ? 'Creating account...' : 'Signing in...'}</>
              ) : (
                <>{isSignup ? 'Create Account' : 'Sign In'} <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        )}

        {/* Phone mode — credentials step */}
        {method === 'phone' && step === 'credentials' && (
          <div className="animate-fade-in space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-phone">Mobile Number</Label>
              <div className="flex items-center gap-2">
                <div className="flex h-10 items-center rounded-lg border border-input bg-muted px-3 text-sm font-medium">
                  +91
                </div>
                <Input
                  id="auth-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit number"
                  className="flex-1"
                />
              </div>
            </div>
            <Button
              className="w-full gap-2"
              disabled={!phoneValid || loading || otpSending || isCoolingDown || (isSignup && !name.trim())}
              onClick={handleSendOtp}
            >
              {loading || otpSending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending code...</>
              ) : isCoolingDown ? (
                <><Timer className="h-4 w-4" /> Resend in {secondsLeft}s</>
              ) : (
                <>Send Verification Code <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              An SMS with a 6-digit code will be sent to verify your number.
            </p>
          </div>
        )}

        {/* Phone mode — OTP step */}
        {method === 'phone' && step === 'otp' && (
          <div className="animate-fade-in space-y-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
              <p className="text-muted-foreground">
                Enter the 6-digit code sent to{' '}
                <span className="font-bold text-foreground">
                  +91 {phone}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-otp">Verification Code</Label>
              <Input
                id="auth-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                className="text-center text-lg font-bold tracking-[0.5em]"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => { setStep('credentials'); setOtp(''); }}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={otp.length !== 6 || loading}
                onClick={handleVerifyOtp}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> Verify &amp; {isSignup ? 'Create Account' : 'Sign In'}</>
                )}
              </Button>
            </div>
            <button
              onClick={handleResendOtp}
              disabled={loading || otpSending || isCoolingDown}
              className="w-full text-center text-sm text-primary hover:underline disabled:opacity-50"
            >
              {isCoolingDown
                ? `Resend available in ${secondsLeft}s`
                : <>Didn&apos;t receive the code? Resend</>}
            </button>
            {isCoolingDown && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700">
                <Timer className="h-4 w-4 animate-pulse" />
                Please wait {secondsLeft}s before requesting another code
              </div>
            )}
          </div>
        )}

        {/* reCAPTCHA container — required by Firebase Phone Auth */}
        <div id={RECAPTCHA_CONTAINER_ID} className="mt-4 flex min-h-[78px] items-center justify-center" />
      </div>
    </div>
  );
}
