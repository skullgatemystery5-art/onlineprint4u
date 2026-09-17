import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';

function cleanIndianPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export type AddressData = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

type Props = {
  initial: AddressData;
  onBack: () => void;
  onNext: (data: AddressData) => void;
};

export function StepAddress({ initial, onBack, onNext }: Props) {
  const { profile } = useAuth();
  const [addr, setAddr] = useState<AddressData>(() => ({
    ...initial,
    phone: cleanIndianPhone(initial.phone),
  }));

  useEffect(() => {
    if (profile) {
      setAddr((prev) => ({
        ...prev,
        name: prev.name || profile.full_name || '',
        phone: prev.phone || cleanIndianPhone(profile.phone || ''),
        email: prev.email || profile.email || '',
      }));
    }
  }, [profile]);

  const isValid =
    addr.name.trim() &&
    /^\d{10}$/.test(addr.phone) &&
    addr.line1.trim() &&
    addr.city.trim() &&
    addr.state.trim() &&
    /^\d{6}$/.test(addr.pincode);

  const handleSubmit = () => {
    if (!isValid) return;
    onNext(addr);
  };

  return (
    <div className="animate-fade-in rounded-3xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Shipping Address</h1>
          <p className="text-sm text-muted-foreground">
            Enter a fresh delivery address for this order.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="addr-name">Full Name</Label>
            <Input
              id="addr-name"
              value={addr.name}
              onChange={(e) => setAddr({ ...addr, name: e.target.value })}
              placeholder="Recipient name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr-phone">Phone Number</Label>
            <div className="flex items-center gap-2">
              <span className="flex h-10 items-center rounded-lg border border-border bg-muted/50 px-3 text-sm font-medium text-muted-foreground">
                +91
              </span>
              <Input
                id="addr-phone"
                value={addr.phone}
                onChange={(e) => setAddr({ ...addr, phone: cleanIndianPhone(e.target.value).slice(0, 10) })}
                placeholder="10-digit mobile"
                maxLength={10}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr-email">Email (optional)</Label>
          <Input
            id="addr-email"
            type="email"
            value={addr.email}
            onChange={(e) => setAddr({ ...addr, email: e.target.value })}
            placeholder="For order confirmation"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr-line1">Address Line 1</Label>
          <Input
            id="addr-line1"
            value={addr.line1}
            onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
            placeholder="House / Flat no, Building name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr-line2">Address Line 2 (optional)</Label>
          <Input
            id="addr-line2"
            value={addr.line2}
            onChange={(e) => setAddr({ ...addr, line2: e.target.value })}
            placeholder="Street, Area, Landmark"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="addr-city">City</Label>
            <Input
              id="addr-city"
              value={addr.city}
              onChange={(e) => setAddr({ ...addr, city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr-state">State</Label>
            <Input
              id="addr-state"
              value={addr.state}
              onChange={(e) => setAddr({ ...addr, state: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr-pincode">PIN Code</Label>
            <Input
              id="addr-pincode"
              value={addr.pincode}
              onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              maxLength={6}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid} className="gap-2">
          Next: Shipping <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
