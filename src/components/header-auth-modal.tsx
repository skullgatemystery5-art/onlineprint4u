import { useState, useEffect, useCallback, useRef } from 'react';
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

export function HeaderAuthModal({ open, onClose, mode }: AuthModalProps) {
  const { sendOtp, verifyOtp, otpSending } = useAuth();
  const { secondsLeft, isCoolingDown, startCooldown } = useCountdown();
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [step, setStep] = useState<Step>('credentials');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setStep('credentials');
      setOtp('');
      setPhone('');
      setEmail('');
      setName('');
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (step === 'otp' && open) {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [step, open]);

  const phoneValid = /^\d{10}$/.test(phone);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const switchMethod = (m: AuthMethod) => {
    setMethod(m);
    setStep('credentials');
    setOtp('');
  };

  const handleSendOtp = useCallback(async () => {
    if (!phoneValid) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    const { error, cooldownSec } = await sendOtp('phone', phone);
    setLoading(false);
    if (error) {
      toast.error(error);
      if (cooldownSec) startCooldown(cooldownSec);
      return;
    }
    toast.success(`OTP sent to +91 ${phone}`);
    setStep('otp');
    startCooldown(30);
  }, [phone, phoneValid, sendOtp, startCooldown]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    const { error } = await verifyOtp('phone', phone, otp);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(mode === 'signup' ? 'Account created! Welcome to Online Print 4U.' : 'Welcome back!');
    onClose();
  }, [otp, phone, verifyOtp, mode, onClose]);

  const handleResendOtp = useCallback(async () => {
    if (isCoolingDown) return;
    if (!phoneValid) return;
    setLoading(true);
    const { error, cooldownSec } = await sendOtp('phone', phone);
    setLoading(false);
    if (error) {
      toast.error(error);
      if (cooldownSec) startCooldown(cooldownSec);
      return;
    }
    toast.success('New OTP sent to +91 ' + phone);
    startCooldown(30);
  }, [phone, phoneValid, sendOtp, isCoolingDown, startCooldown]);

  if (!open) return null;

  const isSignup = mode === 'signup';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
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
                  autoFocus
                />
              </div>
            </div>
            <Button
              className="w-full gap-2"
              disabled={!phoneValid || loading || otpSending || isCoolingDown}
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
                ref={otpInputRef}
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

        {/* Email mode — OTP flow */}
        {method === 'email' && (
          <EmailOtpFlow
            email={email}
            setEmail={setEmail}
            name={name}
            setName={setName}
            isSignup={isSignup}
            sendOtp={sendOtp}
            verifyOtp={verifyOtp}
            otpSending={otpSending}
            onClose={onClose}
            secondsLeft={secondsLeft}
            isCoolingDown={isCoolingDown}
            startCooldown={startCooldown}
          />
        )}
      </div>
    </div>
  );
}

type EmailOtpFlowProps = {
  email: string;
  setEmail: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  isSignup: boolean;
  sendOtp: (channel: 'phone' | 'email', contact: string) => Promise<{ error: string | null; cooldownSec?: number }>;
  verifyOtp: (channel: 'phone' | 'email', contact: string, code: string) => Promise<{ error: string | null }>;
  otpSending: boolean;
  onClose: () => void;
  secondsLeft: number;
  isCoolingDown: boolean;
  startCooldown: (sec: number) => void;
};

function EmailOtpFlow({
  email, setEmail, name, setName, isSignup,
  sendOtp, verifyOtp, otpSending, onClose,
  secondsLeft, isCoolingDown, startCooldown,
}: EmailOtpFlowProps) {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = useCallback(async () => {
    if (!emailValid) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const { error, cooldownSec } = await sendOtp('email', email.trim());
    setLoading(false);
    if (error) {
      toast.error(error);
      if (cooldownSec) startCooldown(cooldownSec);
      return;
    }
    toast.success(`Verification code sent to ${email}`);
    setStep('otp');
    startCooldown(30);
  }, [email, emailValid, sendOtp, startCooldown]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    const { error } = await verifyOtp('email', email.trim(), otp);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(isSignup ? 'Account created! Welcome to Online Print 4U.' : 'Welcome back!');
    onClose();
  }, [otp, email, verifyOtp, isSignup, onClose]);

  const handleResend = useCallback(async () => {
    if (isCoolingDown) return;
    setLoading(true);
    const { error, cooldownSec } = await sendOtp('email', email.trim());
    setLoading(false);
    if (error) {
      toast.error(error);
      if (cooldownSec) startCooldown(cooldownSec);
      return;
    }
    toast.success('New code sent to ' + email);
    startCooldown(30);
  }, [email, sendOtp, isCoolingDown, startCooldown]);

  if (step === 'credentials') {
    return (
      <div className="animate-fade-in space-y-4">
        {isSignup && (
          <div className="space-y-2">
            <Label htmlFor="auth-email-name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-email-name"
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
              autoFocus
            />
          </div>
        </div>
        <Button
          className="w-full gap-2"
          disabled={!emailValid || loading || otpSending || isCoolingDown}
          onClick={handleSend}
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
          A 6-digit code will be emailed to verify your address.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
        <p className="text-muted-foreground">
          Enter the 6-digit code sent to{' '}
          <span className="font-bold text-foreground">{email}</span>
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-email-otp">Verification Code</Label>
        <Input
          id="auth-email-otp"
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
          onClick={handleVerify}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
          ) : (
            <><ShieldCheck className="h-4 w-4" /> Verify &amp; {isSignup ? 'Create Account' : 'Sign In'}</>
          )}
        </Button>
      </div>
      <button
        onClick={handleResend}
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
  );
}
