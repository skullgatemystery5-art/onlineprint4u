import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Phone, Loader2, ChevronRight, ShieldCheck, ArrowRight, ArrowLeft, Timer, MailCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useCountdown } from '@/lib/use-countdown';
import { cn } from '@/lib/utils';

type AuthMethod = 'phone' | 'email';
type AuthStep = 'input' | 'otp' | 'email-sent';

const RECAPTCHA_CONTAINER_ID = 'login-recaptcha-container';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { sendPhoneOtp, verifyPhoneOtp, sendEmailOtp, otpSending } = useAuth();
  const { secondsLeft, isCoolingDown, startCooldown } = useCountdown();
  const [method, setMethod] = useState<AuthMethod>('phone');
  const [step, setStep] = useState<AuthStep>('input');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMethod = (m: AuthMethod) => {
    setMethod(m);
    setStep('input');
    setOtp('');
  };

  const handleSendPhoneOtp = useCallback(async (e: React.FormEvent) => {
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

  const handleVerifyPhoneOtp = useCallback(async (e: React.FormEvent) => {
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

  const handleSendEmailLink = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const { error, cooldownSec } = await sendEmailOtp(email);
    setLoading(false);
    if (error) {
      toast.error(error);
      if (cooldownSec) startCooldown(cooldownSec);
      return;
    }
    toast.success('Sign-in link sent! Check your email.');
    setStep('email-sent');
  }, [email, sendEmailOtp, startCooldown]);

  // Inject reCAPTCHA container into document.body
  useEffect(() => {
    let container = document.getElementById(RECAPTCHA_CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = RECAPTCHA_CONTAINER_ID;
      container.style.position = 'fixed';
      container.style.bottom = '0';
      container.style.left = '0';
      container.style.zIndex = '0';
      document.body.appendChild(container);
    }
    return () => {
      if (container && container.parentElement) {
        container.parentElement.removeChild(container);
      }
    };
  }, []);

  return (
    <AuthShell
      title="Sign in"
      subtitle="Enter your phone number or email to receive a verification code."
      footer={
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to home
        </Link>
      }
    >
      {/* Method switcher */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
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

      {/* Phone: input step */}
      {method === 'phone' && step === 'input' && (
        <form onSubmit={handleSendPhoneOtp} className="space-y-4 animate-fade-in">
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
                autoFocus
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

      {/* Phone: OTP step */}
      {method === 'phone' && step === 'otp' && (
        <form onSubmit={handleVerifyPhoneOtp} className="space-y-4 animate-fade-in">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
            <p className="text-muted-foreground">
              Enter the 6-digit code sent to{' '}
              <span className="font-bold text-foreground">+91 {phone}</span>
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
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => { setStep('input'); setOtp(''); }} disabled={loading}>
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
          <button
            type="button"
            onClick={isCoolingDown ? undefined : handleSendPhoneOtp}
            disabled={loading || otpSending || isCoolingDown}
            className="w-full text-center text-sm text-primary hover:underline disabled:opacity-50"
          >
            {isCoolingDown ? `Resend available in ${secondsLeft}s` : "Didn't receive the code? Resend"}
          </button>
        </form>
      )}

      {/* Email: input step */}
      {method === 'email' && step === 'input' && (
        <form onSubmit={handleSendEmailLink} className="space-y-4 animate-fade-in">
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
                autoFocus
              />
            </div>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading || otpSending || isCoolingDown || !email}>
            {loading || otpSending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending link...</>
            ) : isCoolingDown ? (
              <><Timer className="mr-2 h-4 w-4" /> Resend in {secondsLeft}s</>
            ) : (
              <>Send Sign-In Link <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </form>
      )}

      {/* Email: link sent confirmation */}
      {method === 'email' && step === 'email-sent' && (
        <div className="space-y-4 animate-fade-in text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <MailCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Check your email</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a sign-in link to{' '}
              <span className="font-semibold text-foreground">{email}</span>.
              Click the link in the email to sign in automatically.
            </p>
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={() => setStep('input')}>
            <ArrowLeft className="h-4 w-4" /> Use a different email
          </Button>
          <button
            type="button"
            onClick={handleSendEmailLink}
            disabled={loading || otpSending || isCoolingDown}
            className="w-full text-center text-sm text-primary hover:underline disabled:opacity-50"
          >
            {isCoolingDown ? `Resend available in ${secondsLeft}s` : "Didn't get the email? Resend link"}
          </button>
        </div>
      )}
    </AuthShell>
  );
}
