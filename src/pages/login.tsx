import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Phone, Loader2, ChevronRight, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth, DUMMY_OTP_CODE } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type LoginMode = 'email' | 'phone';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { signInDummy } = useAuth();
  const [mode, setMode] = useState<LoginMode>('email');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (otp !== DUMMY_OTP_CODE) {
      toast.error(`Enter code ${DUMMY_OTP_CODE} to sign in (demo mode).`);
      return;
    }
    setLoading(true);
    try {
      await signInDummy({ email }, email.split('@')[0]);
      toast.success('Welcome back!');
      navigate(redirect);
    } catch {
      toast.error('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== DUMMY_OTP_CODE) {
      toast.error(`Enter code ${DUMMY_OTP_CODE} to sign in (demo mode).`);
      return;
    }
    setLoading(true);
    try {
      await signInDummy({ phone }, `User ${phone.slice(-4)}`);
      toast.success('Login successful!');
      navigate(redirect);
    } catch {
      toast.error('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: LoginMode) => {
    setMode(m);
    setOtp('');
    setOtpSent(false);
  };

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
          onClick={() => switchMode('email')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
            mode === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Mail className="h-4 w-4" /> Email
        </button>
        <button
          onClick={() => switchMode('phone')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
            mode === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Phone className="h-4 w-4" /> Phone
        </button>
      </div>

      {mode === 'email' && (
        <form onSubmit={handleEmailLogin} className="space-y-4 animate-fade-in">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Mail className="h-4 w-4" /> Email Sign In
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter any email address. Use code <span className="font-bold text-foreground">123456</span> to sign in instantly.
            </p>
          </div>
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
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 123456"
              className="text-center text-lg font-bold tracking-[0.5em]"
              required
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" /> Sign In
              </>
            )}
          </Button>
        </form>
      )}

      {mode === 'phone' && (
        <form onSubmit={handlePhoneLogin} className="space-y-4 animate-fade-in">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Phone className="h-4 w-4" /> Phone Sign In
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter any 10-digit mobile number. Use code <span className="font-bold text-foreground">123456</span> to sign in instantly.
            </p>
          </div>
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
          <div className="space-y-2">
            <Label htmlFor="phone-otp">Verification Code</Label>
            <Input
              id="phone-otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 123456"
              className="text-center text-lg font-bold tracking-[0.5em]"
              required
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={phone.length !== 10 || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
              </>
            ) : (
              <>
                Verify &amp; Sign In <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
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
