import { useState, useEffect } from 'react';
import { X, Phone, MapPin, ShieldCheck, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth, DUMMY_OTP_CODE } from '@/lib/auth-context';

type OtpAddressModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
};

type Step = 'details' | 'otp';

export function OtpAddressModal({ open, onClose, onSuccess, title, description }: OtpAddressModalProps) {
  const { signInDummy } = useAuth();
  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (!open) {
      setStep('details');
      setOtp('');
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const phoneValid = /^\d{10}$/.test(phone);
  const pincodeValid = /^\d{6}$/.test(pincode);
  const detailsValid = phoneValid && fullName.trim() && line1.trim() && city.trim() && pincodeValid && stateVal.trim();

  const proceedToOtp = () => {
    if (!detailsValid) {
      toast.error('Please fill in all fields correctly.');
      return;
    }
    setStep('otp');
    toast.success(`Enter code ${DUMMY_OTP_CODE} to verify (demo mode).`);
  };

  const verifyAndLogin = async () => {
    if (otp !== DUMMY_OTP_CODE) {
      toast.error(`Enter code ${DUMMY_OTP_CODE} to verify (demo mode).`);
      return;
    }
    setLoading(true);
    try {
      await signInDummy({ phone }, fullName);
      toast.success('Verified! You are logged in.');
      onSuccess();
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ animation: 'modal-fade-in 0.2s ease-out' }}>
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

        {step === 'details' && (
          <div className="animate-fade-in">
            <div className="mb-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold">{title ?? 'Delivery Details'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {description ?? 'Enter your WhatsApp number and delivery address. Use code 123456 to verify (demo mode).'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block">Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aditya Sharma"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">WhatsApp Number</Label>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 items-center rounded-lg border border-input bg-muted px-3 text-sm font-medium">
                    +91
                  </div>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit number"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">Street Address</Label>
                <Input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="House no, street, area"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block">City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
                <div>
                  <Label className="mb-1.5 block">Pincode</Label>
                  <Input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">State</Label>
                <Input value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="State" />
              </div>
            </div>

            <Button
              className="mt-6 w-full gap-2"
              disabled={!detailsValid || loading}
              onClick={proceedToOtp}
            >
              <Phone className="h-4 w-4" />
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <div className="animate-fade-in">
            <div className="mb-5">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <h2 className="font-display text-xl font-bold">Verify OTP</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter code <span className="font-bold text-foreground">123456</span> to verify your number (demo mode).
              </p>
            </div>

            <div>
              <Label className="mb-1.5 block">OTP Code</Label>
              <Input
                type="tel"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 123456"
                className="text-center text-lg tracking-[0.5em]"
                maxLength={6}
                autoFocus
              />
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => setStep('details')} disabled={loading}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button className="flex-1 gap-2" disabled={otp.length !== 6 || loading} onClick={verifyAndLogin}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Verify & Proceed
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
