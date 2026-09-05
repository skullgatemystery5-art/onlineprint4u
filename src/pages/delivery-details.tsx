import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  User,
  Phone,
  Mail,
  Home,
  Navigation,
  Flag,
  Building2,
  MessageSquare,
  Truck,
  Calendar,
  Check,
  Plus,
  Edit2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Package,
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  getAddresses,
  insertAddress,
  updateAddress,
  isFirebaseConfigured,
  type Address,
} from '@/lib/database';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { formatINR } from '@/lib/pricing';
import { cn } from '@/lib/utils';

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Puducherry', 'Chandigarh', 'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
];

export default function DeliveryDetailsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, totals, shippingRates, selectedCourier, setPincode } = useCart();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [form, setForm] = useState({
    label: 'Home',
    name: '',
    phone: '',
    alternate_phone: '',
    email: '',
    house_flat: '',
    street_area: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    delivery_instructions: '',
    is_default: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?redirect=/delivery-details');
      return;
    }
    loadAddresses();
  }, [user, authLoading, navigate]);

  const loadAddresses = async () => {
    if (!user) return;
    if (!isFirebaseConfigured) {
      setShowForm(true);
      setLoadingAddresses(false);
      return;
    }
    setLoadingAddresses(true);
    try {
      const data = await getAddresses(user.uid);
      if (data.length > 0) {
        setAddresses(data);
        const def = data.find((a) => a.is_default) ?? data[0];
        setSelectedAddressId(def.id);
        setPincode(def.pincode);
      } else {
        setShowForm(true);
      }
    } catch {
      setShowForm(true);
    }
    setLoadingAddresses(false);
  };

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Recipient name is required';
    if (!form.phone.trim()) e.phone = 'Mobile number is required';
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) e.phone = 'Enter a valid 10-digit mobile number';
    if (form.alternate_phone && !/^\d{10}$/.test(form.alternate_phone.replace(/\D/g, '')))
      e.alternate_phone = 'Enter a valid 10-digit number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.house_flat.trim()) e.house_flat = 'House/Flat number is required';
    if (!form.street_area.trim()) e.street_area = 'Street/Area is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) e.state = 'State is required';
    if (!form.pincode.trim()) e.pincode = 'PIN code is required';
    else if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a valid 6-digit PIN code';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.uid,
        label: form.label,
        name: form.name,
        phone: form.phone,
        alternate_phone: form.alternate_phone || null,
        email: form.email || null,
        line1: form.house_flat,
        line2: form.street_area,
        house_flat: form.house_flat,
        street_area: form.street_area,
        landmark: form.landmark || null,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        delivery_instructions: form.delivery_instructions || null,
        is_default: form.is_default,
      };

      if (editingId) {
        await updateAddress(editingId, payload);
        toast.success('Address updated.');
      } else {
        await insertAddress(payload);
        toast.success('Address saved.');
      }

      // If default, unset others
      if (form.is_default) {
        const all = await getAddresses(user.uid);
        await Promise.all(
          all
            .filter((a) => a.id !== editingId && a.is_default)
            .map((a) => updateAddress(a.id, { is_default: false }))
        );
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      await loadAddresses();
    } catch {
      toast.error('Failed to save address.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      label: 'Home',
      name: '',
      phone: '',
      alternate_phone: '',
      email: '',
      house_flat: '',
      street_area: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      delivery_instructions: '',
      is_default: false,
    });
    setErrors({});
  };

  const handleEdit = (addr: Address) => {
    setEditingId(addr.id);
    setForm({
      label: addr.label,
      name: addr.name,
      phone: addr.phone,
      alternate_phone: addr.alternate_phone ?? '',
      email: addr.email ?? '',
      house_flat: addr.house_flat ?? addr.line1,
      street_area: addr.street_area ?? addr.line2 ?? '',
      landmark: addr.landmark ?? '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      delivery_instructions: addr.delivery_instructions ?? '',
      is_default: addr.is_default,
    });
    setShowForm(true);
  };

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setPincode(addr.pincode);
    toast.success('Address selected.');
  };

  const handleContinue = () => {
    if (!selectedAddressId && !showForm) {
      toast.error('Please select or add a delivery address.');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      navigate('/print');
      return;
    }
    navigate('/checkout');
  };

  const currentShippingRate = shippingRates.find((s) => s.courier_type === selectedCourier);
  const estimatedDate = currentShippingRate
    ? new Date(Date.now() + currentShippingRate.estimated_days * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

  if (authLoading || loadingAddresses) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-10">
        <div className="container mx-auto max-w-5xl px-4 lg:px-8">
          <div className="mb-6 flex items-center gap-4">
            <Link to="/cart">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold">Delivery Details</h1>
              <p className="text-sm text-muted-foreground">Choose or add a delivery address</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Address management */}
            <div className="space-y-6 lg:col-span-2">
              {/* Saved addresses */}
              {addresses.length > 0 && !showForm && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold">Saved Addresses</h2>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        resetForm();
                        setEditingId(null);
                        setShowForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Add New
                    </Button>
                  </div>
                  {addresses.map((addr) => (
                    <Card
                      key={addr.id}
                      className={cn(
                        'cursor-pointer border-2 transition-all',
                        selectedAddressId === addr.id
                          ? 'border-primary shadow-glow'
                          : 'border-border hover:border-primary/50'
                      )}
                      onClick={() => handleSelectAddress(addr)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                                selectedAddressId === addr.id
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border'
                              )}
                            >
                              {selectedAddressId === addr.id && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-display text-sm font-semibold">{addr.label}</p>
                                {addr.is_default && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                              <p className="mt-1 text-sm font-medium">{addr.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {addr.house_flat ?? addr.line1}, {addr.street_area ?? addr.line2}
                                {addr.landmark ? `, near ${addr.landmark}` : ''}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {addr.city}, {addr.state} - {addr.pincode}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>Phone: {addr.phone}</span>
                                {addr.alternate_phone && <span>Alt: {addr.alternate_phone}</span>}
                                {addr.email && <span>Email: {addr.email}</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(addr);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add/Edit form */}
              {showForm && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {editingId ? 'Edit Address' : 'Add New Address'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Label */}
                    <div className="flex gap-2">
                      {['Home', 'Office', 'Other'].map((l) => (
                        <button
                          key={l}
                          onClick={() => setForm({ ...form, label: l })}
                          className={cn(
                            'rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all',
                            form.label === l
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>

                    {/* Recipient Name + Phone */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Recipient Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="pl-10"
                            placeholder="Full name"
                          />
                        </div>
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Mobile Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            className="pl-10"
                            placeholder="10-digit mobile number"
                          />
                        </div>
                        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                      </div>
                    </div>

                    {/* Alt phone + email */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="alt_phone">Alternate Mobile Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="alt_phone"
                            type="tel"
                            value={form.alternate_phone}
                            onChange={(e) => setForm({ ...form, alternate_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            className="pl-10"
                            placeholder="Optional alternate number"
                          />
                        </div>
                        {errors.alternate_phone && <p className="text-xs text-destructive">{errors.alternate_phone}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="pl-10"
                            placeholder="For delivery updates"
                          />
                        </div>
                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                      </div>
                    </div>

                    {/* House/Flat + Street/Area */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="house_flat">House / Flat Number *</Label>
                        <div className="relative">
                          <Home className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="house_flat"
                            value={form.house_flat}
                            onChange={(e) => setForm({ ...form, house_flat: e.target.value })}
                            className="pl-10"
                            placeholder="e.g. Flat 302, B Wing"
                          />
                        </div>
                        {errors.house_flat && <p className="text-xs text-destructive">{errors.house_flat}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="street_area">Street / Area *</Label>
                        <div className="relative">
                          <Navigation className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="street_area"
                            value={form.street_area}
                            onChange={(e) => setForm({ ...form, street_area: e.target.value })}
                            className="pl-10"
                            placeholder="e.g. MG Road, Indiranagar"
                          />
                        </div>
                        {errors.street_area && <p className="text-xs text-destructive">{errors.street_area}</p>}
                      </div>
                    </div>

                    {/* Landmark */}
                    <div className="space-y-2">
                      <Label htmlFor="landmark">Landmark</Label>
                      <div className="relative">
                        <Flag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="landmark"
                          value={form.landmark}
                          onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                          className="pl-10"
                          placeholder="e.g. Near City Mall"
                        />
                      </div>
                    </div>

                    {/* City + State + PIN */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="city"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                            className="pl-10"
                            placeholder="City"
                          />
                        </div>
                        {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <select
                          id="state"
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                          className={cn(
                            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            !form.state && 'text-muted-foreground'
                          )}
                        >
                          <option value="">Select state</option>
                          {indianStates.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">PIN Code *</Label>
                        <Input
                          id="pincode"
                          value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          placeholder="6-digit PIN"
                          maxLength={6}
                        />
                        {errors.pincode && <p className="text-xs text-destructive">{errors.pincode}</p>}
                      </div>
                    </div>

                    {/* Delivery Instructions */}
                    <div className="space-y-2">
                      <Label htmlFor="instructions">Delivery Instructions</Label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="instructions"
                          value={form.delivery_instructions}
                          onChange={(e) => setForm({ ...form, delivery_instructions: e.target.value })}
                          className="pl-10"
                          placeholder="e.g. Call before delivery, leave at security desk..."
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Default checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, is_default: !form.is_default })}
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors',
                          form.is_default ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                        )}
                      >
                        {form.is_default && <Check className="h-3 w-3" />}
                      </button>
                      <span className="text-sm">Set as default address</span>
                    </label>

                    {/* Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveAddress} disabled={saving} className="gap-2">
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" /> {editingId ? 'Update Address' : 'Save Address'}
                          </>
                        )}
                      </Button>
                      {addresses.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowForm(false);
                            setEditingId(null);
                            resetForm();
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Order Summary + Delivery Method */}
            <div className="space-y-4">
              {/* Delivery Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-5 w-5 text-primary" /> Delivery Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex w-full items-center justify-between rounded-xl border-2 border-primary bg-primary/5 p-3 text-left">
                    <div>
                      <p className="text-sm font-semibold">Local Delivery (Only in Patna)</p>
                      <p className="text-xs text-muted-foreground">1-2 Days</p>
                    </div>
                    <p className="text-sm font-bold text-primary">₹69.00</p>
                  </div>

                  {currentShippingRate && (
                    <div className="rounded-xl bg-primary/5 p-3 animate-scale-in">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Est. Delivery:</span>
                        <span className="font-semibold">{estimatedDate}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Shipping:</span>
                        <span className="font-semibold">{formatINR(totals.shippingCost)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-primary" /> Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="h-4 w-4" />
                        </div>
                        <span className="flex-1 truncate text-muted-foreground">{item.fileName}</span>
                        <span className="font-medium">{formatINR(item.price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 border-t border-border pt-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatINR(totals.subtotal)}</span>
                    </div>
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount</span>
                        <span>-{formatINR(totals.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatINR(totals.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatINR(totals.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Continue button */}
              <Button
                onClick={handleContinue}
                className="w-full gap-2"
                size="lg"
                disabled={items.length === 0}
              >
                Continue to Payment <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Secure checkout • Your data is protected
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
