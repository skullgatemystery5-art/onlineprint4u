import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin, adminResetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
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
    const { error } = await adminLogin(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Welcome back, Admin!');
    navigate('/admin');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const { error } = await adminResetPassword(email);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setResetSent(true);
    toast.success('Password reset link sent!');
  };

  return (
    <AuthShell
      title="Admin Panel"
      subtitle="Secure access for Online Print 4U administrators only."
      footer={
        <Link to="/" className="flex items-center justify-center gap-1.5 font-semibold text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to website
        </Link>
      }
    >
      {forgotMode ? (
        resetSent ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <ShieldCheck className="h-10 w-10 text-emerald-600" />
            </div>
            <p className="text-sm text-muted-foreground">
              We have sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
              Please check your inbox and follow the instructions.
            </p>
            <Button variant="outline" className="w-full" onClick={() => { setForgotMode(false); setResetSent(false); }}>
              Back to Admin Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
              Enter your admin email and we'll send you a password reset link.
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@onlineprint4u.in"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <>Send Reset Link</>}
            </Button>
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Back to login
            </button>
          </form>
        )
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Restricted Area</p>
              <p className="text-xs text-muted-foreground">Authorized personnel only</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@onlineprint4u.in"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-password"
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

          <button
            type="button"
            onClick={() => setForgotMode(true)}
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </button>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
            ) : (
              <><ShieldCheck className="h-4 w-4" /> Sign In to Admin Panel</>
            )}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
