import { useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, ChevronRight, ArrowRight, ArrowLeft, ShieldCheck, Timer } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useCountdown } from '@/lib/use-countdown';

type LoginStep = 'credentials' | 'otp';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { sendEmailOtp, verifyEmailOtp, otpSending } = useAuth();
  const { secondsLeft, isCoolingDown, startCooldown } = useCountdown();
  const [step, setStep] = useState<LoginStep>('credentials');

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
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
    toast.success('Verification code sent to your email.');
    setStep('otp');
  }, [email, sendEmailOtp, startCooldown]);


  const handleVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    const { error } = await verifyEmailOtp(email, otp);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Welcome back!');
    navigate(redirect);
  }, [otp, email, verifyEmailOtp, navigate, redirect]);

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
      {step === 'credentials' && (
        <form onSubmit={handleSendOtp} className="space-y-4 animate-fade-in">
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
          <Button type="submit" className="w-full gap-2" disabled={loading || otpSending || isCoolingDown}>
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

      {step === 'otp' && (
        <form onSubmit={handleVerify} className="space-y-4 animate-fade-in">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm">
            <p className="text-muted-foreground">
              Enter the 6-digit code sent to{' '}
              <span className="font-bold text-foreground">
                {email}
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

      <div className="mt-6 text-center">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </AuthShell>
  );
}
