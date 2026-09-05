import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Phone, Loader2, ChevronRight, ShieldCheck, ArrowRight, ArrowLeft, Timer, Lock } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useCountdown } from '@/lib/use-countdown';
import { cn } from '@/lib/utils';

type LoginMode = 'email' | 'phone';
type LoginStep = 'credentials' | 'otp';

const RECAPTCHA_CONTAINER_ID = 'login-recaptcha-container';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { sendPhoneOtp, verifyPhoneOtp, signInWithEmail, otpSending } = useAuth();
  const { secondsLeft, isCoolingDown, startCooldown } = useCountdown();
  const [mode, setMode] = useState<LoginMode>('phone');
  const [step, setStep] = useState<LoginStep>('credentials');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Welcome back!');
    navigate(redirect);
  }, [email, password, signInWithEmail, navigate, redirect]);

  const handleSendOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
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
    toast.success('Verification code sent to your phone.');
    setStep('otp');
  }, [phone, sendPhoneOtp, startCooldown]);

  const handleVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
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
    toast.success('Welcome back!');
    navigate(redirect);
  }, [otp, verifyPhoneOtp, navigate, redirect]);

  const switchMode = (m: LoginMode) => {
    setMode(m);
    setStep('credentials');
    setOtp('');
  };

  useEffect(() => {
    return () => {
      const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
      if (container) container.innerHTML = '';
    };
  }, []);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Online Print 4U account to track orders and print more."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Sign up free
          </Link>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        <button
          onClick={() => switchMode('phone')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
            mode === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Phone className="h-4 w-4" /> Phone
        </button>
        <button
          onClick={() => switchMode('email')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
            mode === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Mail className="h-4 w-4" /> Email
        </button>
      </div>

      {mode === 'email' && (
        <form onSubmit={handleEmailLogin} className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
            ) : (
              <>Sign In <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
          <div className="text-center">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot your password?
            </Link>
          </div>
        </form>
      )}

      {mode === 'phone' && step === 'credentials' && (
        <form onSubmit={handleSendOtp} className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number</Label>
            <div className="flex items-center gap-2">
              <div className="flex h-10 items-center rounded-lg border border-input bg-muted px-3 text-sm font-medium">
                +91
              </div>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                className="flex-1"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading || otpSending || isCoolingDown || phone.length !== 10}>
            {loading || otpSending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code...</>
            ) : isCoolingDown ? (
              <><Timer className="mr-2 h-4 w-4" /> Resend in {secondsLeft}s</>
            ) : (
              <>Send Verification Code <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </form>
      )}

      {mode === 'phone' && step === 'otp' && (
        <form onSubmit={handleVerify} className="space-y-4 animate-fade-in">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
            <p className="text-muted-foreground">
              Enter the 6-digit code sent to{' '}
              <span className="font-bold text-foreground">
                +91 {phone}
              </span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              className="text-center text-lg font-bold tracking-[0.5em]"
              required
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => { setStep('credentials'); setOtp(''); }} disabled={loading}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={otp.length !== 6 || loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
              ) : (
                <><ShieldCheck className="h-4 w-4" /> Verify &amp; Sign In <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* reCAPTCHA container for Firebase Phone Auth */}
      <div id={RECAPTCHA_CONTAINER_ID} className="mt-4 flex min-h-[78px] items-center justify-center" />

      <div className="mt-6 text-center">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </AuthShell>
  );
}
