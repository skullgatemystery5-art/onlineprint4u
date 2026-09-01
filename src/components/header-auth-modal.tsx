import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Loader2,
  ArrowRight,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
};

export function HeaderAuthModal({ open, onClose, mode }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setName('');
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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
      if (mode === 'signup') {
        if (!name.trim()) {
          toast.error('Please enter your name.');
          setLoading(false);
          return;
        }
        const { error } = await signUpWithEmail(email, password, name.trim());
        setLoading(false);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Account created! Welcome to Online Print 4U.');
      } else {
        const { error } = await signInWithEmail(email, password);
        setLoading(false);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Welcome back!');
      }
      onClose();
    },
    [email, password, name, mode, signInWithEmail, signUpWithEmail, onClose]
  );

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

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
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
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {isSignup ? 'Creating account...' : 'Signing in...'}</>
            ) : (
              <>{isSignup ? 'Create Account' : 'Sign In'} <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
