import { useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Loader2, ChevronRight, ShieldCheck, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
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
      <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
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
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="pl-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
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
          <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </AuthShell>
  );
}
