import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, User, Loader2, ChevronRight, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { upsertProfile } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type SignupMode = 'email' | 'phone';
type SignupStep = 'details' | 'otp';

const RECAPTCHA_CONTAINER_ID = 'signup-recaptcha-container';

export default function SignupPage() {
  const navigate = useNavigate();
  const { user: authUser, sendPhoneOtp, verifyPhoneOtp, sendEmailOtp, verifyEmailOtp } = useAuth();
  const [mode, setMode] = useState<SignupMode>('phone');
  const [step, setStep] = useState<SignupStep>('details');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name.');
      return;
    }
    if (mode === 'email') {
      if (!email || !email.includes('@')) {
        toast.error('Please enter a valid email address.');
        return;
      }
      setLoading(true);
      const { error } = await sendEmailOtp(email);
      setLoading(false);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Verification code sent to your email.');
    } else {
      if (phone.length !== 10) {
        toast.error('Please enter a valid 10-digit mobile number.');
        return;
      }
      setLoading(true);
      const { error } = await sendPhoneOtp(phone, RECAPTCHA_CONTAINER_ID);
      setLoading(false);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Verification code sent to your phone.');
    }
    setStep('otp');
  }, [name, mode, email, phone, sendEmailOtp, sendPhoneOtp]);

  const handleVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    const { error } =
      mode === 'email'
        ? await verifyEmailOtp(email, otp)
        : await verifyPhoneOtp(otp);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    // Update profile with the name they entered
    try {
      if (authUser) {
        await upsertProfile({
          id: authUser.uid,
          email: authUser.email ?? email,
          full_name: name,
          phone: authUser.phoneNumber ?? `+91${phone}`,
          role: 'user',
        });
      }
    } catch {
      // Non-blocking — profile will be created on next login
    }
    toast.success('Account created! Welcome to Online Print 4U.');
    navigate('/dashboard');
  }, [otp, mode, email, phone, name, authUser, verifyEmailOtp, verifyPhoneOtp, navigate]);

  const switchMode = (m: SignupMode) => {
    setMode(m);
    setStep('details');
    setOtp('');
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join Online Print 4U and start printing in minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
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

      {step === 'details' && (
        <form onSubmit={handleSendOtp} className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="pl-10"
                required
              />
            </div>
          </div>
          {mode === 'email' ? (
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
          ) : (
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
          )}
          <Button type="submit" className="w-full gap-2" disabled={loading || (mode === 'phone' && phone.length !== 10)}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code...</>
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
                {mode === 'email' ? email : `+91 ${phone}`}
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
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => { setStep('details'); setOtp(''); }} disabled={loading}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={otp.length !== 6 || loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
              ) : (
                <><ShieldCheck className="h-4 w-4" /> Verify &amp; Create Account <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Hidden reCAPTCHA container for Firebase Phone Auth */}
      <div id={RECAPTCHA_CONTAINER_ID} className="mt-2 min-h-[1px]" />

      <div className="mt-6 text-center">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </AuthShell>
  );
}
