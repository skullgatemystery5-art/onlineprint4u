import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Tag,
  Truck,
  Settings2,
  BarChart3,
  Printer,
  FileText,
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Settings,
  Save,
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase, type Order, type Profile, type Coupon, type PricingRate, type ShippingRate } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatINR } from '@/lib/pricing';
import { cn } from '@/lib/utils';

const statusOptions = ['placed', 'processing', 'printed', 'shipped', 'delivered', 'cancelled'];

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingRate, setEditingRate] = useState<PricingRate | null>(null);
  const [editingShipping, setEditingShipping] = useState<ShippingRate | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'flat',
    value: 0,
    min_order: 0,
    max_discount: '',
    active: true,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?redirect=/admin');
      return;
    }
    if (profile?.role === 'admin') {
      setAuthorized(true);
      setChecking(false);
      loadAll();
    } else {
      navigate('/dashboard');
      return;
    }
  }, [user, profile, authLoading, navigate]);

  const loadAll = async () => {
    setLoading(true);
    const [ordersRes, usersRes, couponsRes, ratesRes, shippingRes, settingsRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('pricing_rates').select('*').order('category', { ascending: true }),
      supabase.from('shipping_rates').select('*').order('base_rate', { ascending: true }),
      supabase.from('site_settings').select('*'),
    ]);
    if (ordersRes.data) setOrders(ordersRes.data as Order[]);
    if (usersRes.data) setUsers(usersRes.data as Profile[]);
    if (couponsRes.data) setCoupons(couponsRes.data as Coupon[]);
    if (ratesRes.data) setRates(ratesRes.data as PricingRate[]);
    if (shippingRes.data) setShippingRates(shippingRes.data as ShippingRate[]);
    if (settingsRes.data) {
      const map: Record<string, string> = {};
      (settingsRes.data as Array<{ key: string; value: string }>).forEach((s) => { map[s.key] = s.value; });
      setSiteSettings(map);
      setSettingsForm(map);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: status })
        .eq('id', orderId);
      if (error) throw error;
      await supabase.from('order_status_log').insert({
        order_id: orderId,
        status,
        note: `Status updated to ${status}`,
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: status as Order['order_status'] } : o))
      );
      toast.success(`Order status updated to ${status}`);
    } catch {
      toast.error('Failed to update order status.');
    }
  };

  const updateRate = async (rate: PricingRate) => {
    try {
      const { error } = await supabase
        .from('pricing_rates')
        .update({ price: rate.price, label: rate.label, active: rate.active })
        .eq('id', rate.id);
      if (error) throw error;
      setRates((prev) => prev.map((r) => (r.id === rate.id ? rate : r)));
      toast.success('Pricing rate updated.');
      setEditingRate(null);
    } catch {
      toast.error('Failed to update rate.');
    }
  };

  const updateShippingRate = async (rate: ShippingRate) => {
    try {
      const { error } = await supabase
        .from('shipping_rates')
        .update({
          label: rate.label,
          base_rate: rate.base_rate,
          per_kg_rate: rate.per_kg_rate,
          estimated_days: rate.estimated_days,
          active: rate.active,
        })
        .eq('id', rate.id);
      if (error) throw error;
      setShippingRates((prev) => prev.map((r) => (r.id === rate.id ? rate : r)));
      toast.success('Shipping rate updated.');
      setEditingShipping(null);
    } catch {
      toast.error('Failed to update shipping rate.');
    }
  };

  const saveCoupon = async () => {
    try {
      const payload = {
        code: couponForm.code.toUpperCase(),
        description: couponForm.description,
        discount_type: couponForm.discount_type,
        value: couponForm.value,
        min_order: couponForm.min_order,
        max_discount: couponForm.max_discount ? parseFloat(couponForm.max_discount) : null,
        active: couponForm.active,
      };
      if (editingCoupon) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', editingCoupon.id);
        if (error) throw error;
        toast.success('Coupon updated.');
      } else {
        const { error } = await supabase.from('coupons').insert(payload);
        if (error) throw error;
        toast.success('Coupon created.');
      }
      setShowCouponForm(false);
      setEditingCoupon(null);
      setCouponForm({ code: '', description: '', discount_type: 'flat', value: 0, min_order: 0, max_discount: '', active: true });
      const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (data) setCoupons(data as Coupon[]);
    } catch {
      toast.error('Failed to save coupon.');
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast.success('Coupon deleted.');
    } catch {
      toast.error('Failed to delete coupon.');
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const updates = Object.entries(settingsForm).filter(([k, v]) => siteSettings[k] !== v);
      for (const [key, value] of updates) {
        await supabase.from('site_settings').upsert({ key, value, description: '' }, { onConflict: 'key' });
      }
      setSiteSettings({ ...settingsForm });
      toast.success('Site settings saved.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  if (checking || authLoading) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Checking access...</div>
        </main>
      </>
    );
  }

  if (!authorized) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
          <XCircle className="h-16 w-16 text-destructive" />
          <h1 className="font-display text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You do not have admin access.</p>
          <Link to="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </main>
      </>
    );
  }

  // Analytics
  const totalRevenue = orders.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter((o) => ['placed', 'processing', 'printed'].includes(o.order_status)).length;
  const deliveredOrders = orders.filter((o) => o.order_status === 'delivered').length;
  const printQueue = orders.filter((o) => ['placed', 'processing'].includes(o.order_status));

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-10">
        <div className="container mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8 flex items-center gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
              <p className="mt-1 text-muted-foreground">Manage Online Print 4U operations</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <IndianRupee className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="font-display text-2xl font-bold">{formatINR(totalRevenue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="font-display text-2xl font-bold">{orders.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Orders</p>
                  <p className="font-display text-2xl font-bold">{pendingOrders}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                  <p className="font-display text-2xl font-bold">{deliveredOrders}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="orders">
            <TabsList className="mb-6 flex flex-wrap gap-1">
              <TabsTrigger value="orders" className="gap-1.5"><Package className="h-4 w-4" /> Orders</TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> Users</TabsTrigger>
              <TabsTrigger value="queue" className="gap-1.5"><Printer className="h-4 w-4" /> Print Queue</TabsTrigger>
              <TabsTrigger value="pricing" className="gap-1.5"><Settings2 className="h-4 w-4" /> Pricing</TabsTrigger>
              <TabsTrigger value="shipping" className="gap-1.5"><Truck className="h-4 w-4" /> Shipping</TabsTrigger>
              <TabsTrigger value="coupons" className="gap-1.5"><Tag className="h-4 w-4" /> Coupons</TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Reports</TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
            </TabsList>

            {/* Orders */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No orders yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-3 pr-4 font-semibold">Order #</th>
                            <th className="pb-3 pr-4 font-semibold">Customer</th>
                            <th className="pb-3 pr-4 font-semibold">Items</th>
                            <th className="pb-3 pr-4 font-semibold">Total</th>
                            <th className="pb-3 pr-4 font-semibold">Payment</th>
                            <th className="pb-3 pr-4 font-semibold">Status</th>
                            <th className="pb-3 font-semibold">Update</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.id} className="border-b border-border/50">
                              <td className="py-3 pr-4">
                                <p className="font-mono text-xs font-semibold">{order.order_number}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString('en-IN')}
                                </p>
                              </td>
                              <td className="py-3 pr-4">
                                <p className="text-xs font-medium">{order.shipping_name}</p>
                                <p className="text-xs text-muted-foreground">{order.shipping_phone}</p>
                              </td>
                              <td className="py-3 pr-4 text-xs">{order.items.length} items</td>
                              <td className="py-3 pr-4 font-semibold">{formatINR(order.total)}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                                  {order.payment_status}
                                </Badge>
                              </td>
                              <td className="py-3 pr-4">
                                <Badge variant="outline">{order.order_status}</Badge>
                              </td>
                              <td className="py-3">
                                <Select
                                  value={order.order_status}
                                  onValueChange={(v) => updateOrderStatus(order.id, v)}
                                >
                                  <SelectTrigger className="h-8 w-36 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusOptions.map((s) => (
                                      <SelectItem key={s} value={s} className="capitalize text-xs">
                                        {s}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Users</CardTitle>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No users yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-3 pr-4 font-semibold">Name</th>
                            <th className="pb-3 pr-4 font-semibold">Email</th>
                            <th className="pb-3 pr-4 font-semibold">Phone</th>
                            <th className="pb-3 pr-4 font-semibold">Role</th>
                            <th className="pb-3 font-semibold">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id} className="border-b border-border/50">
                              <td className="py-3 pr-4 font-medium">{u.full_name}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                              <td className="py-3 pr-4 text-muted-foreground">{u.phone || '-'}</td>
                              <td className="py-3 pr-4">
                                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                                  {u.role}
                                </Badge>
                              </td>
                              <td className="py-3 text-xs text-muted-foreground">
                                {new Date(u.created_at).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Print Queue */}
            <TabsContent value="queue">
              <Card>
                <CardHeader>
                  <CardTitle>Print Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  {printQueue.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Print queue is empty.</p>
                  ) : (
                    <div className="space-y-3">
                      {printQueue.map((order) => (
                        <div key={order.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                          <div>
                            <p className="font-mono text-sm font-semibold">{order.order_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.shipping_name} • {order.items.length} items • {formatINR(order.total)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(order.items as Array<{ fileName: string; pages: number; printType: string; copies: number }>).map((item, i) => (
                                <span key={i} className="rounded-md bg-muted px-2 py-1 text-xs">
                                  {item.fileName} ({item.pages}p × {item.copies}) {item.printType === 'bw' ? 'B&W' : 'Color'}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Select
                              value={order.order_status}
                              onValueChange={(v) => updateOrderStatus(order.id, v)}
                            >
                              <SelectTrigger className="h-8 w-36 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((s) => (
                                  <SelectItem key={s} value={s} className="capitalize text-xs">
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pricing */}
            <TabsContent value="pricing">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Pricing Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {[
                      { key: 'print_per_page', label: 'Print Per Page' },
                      { key: 'binding', label: 'Binding' },
                      { key: 'lamination', label: 'Lamination' },
                      { key: 'addons', label: 'Add-ons' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <h3 className="mb-3 font-display text-sm font-semibold">{label}</h3>
                        <div className="space-y-2">
                          {rates.filter((r) => r.category === key).map((rate) => (
                            <div key={rate.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{rate.label}</p>
                                <p className="text-xs text-muted-foreground">{rate.unit}</p>
                              </div>
                              {editingRate?.id === rate.id ? (
                                <>
                                  <Input
                                    type="number"
                                    value={editingRate.price}
                                    onChange={(e) => setEditingRate({ ...editingRate, price: parseFloat(e.target.value) || 0 })}
                                    className="w-24"
                                    step="0.01"
                                  />
                                  <Button size="sm" onClick={() => updateRate(editingRate)}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingRate(null)}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold">{formatINR(rate.price)}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingRate(rate)}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shipping */}
            <TabsContent value="shipping">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Shipping Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {shippingRates.map((rate) => (
                      <div key={rate.id} className="rounded-xl border border-border p-4">
                        {editingShipping?.id === rate.id ? (
                          <div className="grid gap-3 sm:grid-cols-4">
                            <div>
                              <Label className="text-xs">Label</Label>
                              <Input
                                value={editingShipping.label}
                                onChange={(e) => setEditingShipping({ ...editingShipping, label: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Base Rate</Label>
                              <Input
                                type="number"
                                value={editingShipping.base_rate}
                                onChange={(e) => setEditingShipping({ ...editingShipping, base_rate: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Per KG Rate</Label>
                              <Input
                                type="number"
                                value={editingShipping.per_kg_rate}
                                onChange={(e) => setEditingShipping({ ...editingShipping, per_kg_rate: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Est. Days</Label>
                              <Input
                                type="number"
                                value={editingShipping.estimated_days}
                                onChange={(e) => setEditingShipping({ ...editingShipping, estimated_days: parseInt(e.target.value) || 1 })}
                              />
                            </div>
                            <div className="flex gap-2 sm:col-span-4">
                              <Button size="sm" onClick={() => updateShippingRate(editingShipping)}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingShipping(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-display text-sm font-semibold">{rate.label}</p>
                              <p className="text-xs text-muted-foreground">
                                Base: {formatINR(rate.base_rate)} • Per KG: {formatINR(rate.per_kg_rate)} • {rate.estimated_days} days
                              </p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setEditingShipping(rate)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Coupons */}
            <TabsContent value="coupons">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Manage Coupons</CardTitle>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setEditingCoupon(null);
                        setCouponForm({ code: '', description: '', discount_type: 'flat', value: 0, min_order: 0, max_discount: '', active: true });
                        setShowCouponForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> New Coupon
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showCouponForm && (
                    <div className="mb-6 rounded-xl border border-border p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Code</Label>
                          <Input
                            value={couponForm.code}
                            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                            placeholder="SAVE20"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={couponForm.description}
                            onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={couponForm.discount_type}
                            onValueChange={(v) => setCouponForm({ ...couponForm, discount_type: v })}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="flat">Flat</SelectItem>
                              <SelectItem value="percent">Percent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Value</Label>
                          <Input
                            type="number"
                            value={couponForm.value}
                            onChange={(e) => setCouponForm({ ...couponForm, value: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Min Order</Label>
                          <Input
                            type="number"
                            value={couponForm.min_order}
                            onChange={(e) => setCouponForm({ ...couponForm, min_order: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max Discount (optional)</Label>
                          <Input
                            type="number"
                            value={couponForm.max_discount}
                            onChange={(e) => setCouponForm({ ...couponForm, max_discount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={saveCoupon}>{editingCoupon ? 'Update' : 'Create'}</Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowCouponForm(false); setEditingCoupon(null); }}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {coupons.map((coupon) => (
                      <div key={coupon.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-bold">{coupon.code}</p>
                            <Badge variant={coupon.active ? 'default' : 'secondary'}>
                              {coupon.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{coupon.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {coupon.discount_type === 'flat' ? formatINR(coupon.value) : `${coupon.value}%`} off • Min: {formatINR(coupon.min_order)} • Used: {coupon.used_count}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCoupon(coupon);
                              setCouponForm({
                                code: coupon.code,
                                description: coupon.description,
                                discount_type: coupon.discount_type,
                                value: coupon.value,
                                min_order: coupon.min_order,
                                max_discount: coupon.max_discount?.toString() ?? '',
                                active: coupon.active,
                              });
                              setShowCouponForm(true);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteCoupon(coupon.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports */}
            <TabsContent value="reports">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                        <p className="font-display text-2xl font-bold text-primary">{formatINR(totalRevenue)}</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-xs text-muted-foreground">Avg Order Value</p>
                        <p className="font-display text-2xl font-bold">
                          {orders.length > 0 ? formatINR(totalRevenue / orders.length) : formatINR(0)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-xs text-muted-foreground">Delivery Rate</p>
                        <p className="font-display text-2xl font-bold">
                          {orders.length > 0 ? Math.round((deliveredOrders / orders.length) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Order Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statusOptions.map((status) => {
                        const count = orders.filter((o) => o.order_status === status).length;
                        const pct = orders.length > 0 ? (count / orders.length) * 100 : 0;
                        return (
                          <div key={status}>
                            <div className="flex justify-between text-sm">
                              <span className="capitalize font-medium">{status}</span>
                              <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-xs text-muted-foreground">Razorpay Orders</p>
                        <p className="font-display text-2xl font-bold">
                          {orders.filter((o) => o.payment_method === 'razorpay').length}
                        </p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-xs text-muted-foreground">COD Orders</p>
                        <p className="font-display text-2xl font-bold">
                          {orders.filter((o) => o.payment_method === 'cod').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            {/* Settings */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Site Settings</CardTitle>
                    <Button size="sm" className="gap-1.5" disabled={savingSettings} onClick={saveSettings}>
                      {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Settings
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="mb-3 font-display text-sm font-semibold">UPI / QR Payment</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">UPI ID</Label>
                          <Input value={settingsForm.upi_id ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, upi_id: e.target.value })} placeholder="yourname@okhdfcbank" />
                        </div>
                        <div>
                          <Label className="text-xs">Payee Name</Label>
                          <Input value={settingsForm.payee_name ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, payee_name: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">QR Code Image Path/URL</Label>
                          <Input value={settingsForm.qr_code_image ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, qr_code_image: e.target.value })} placeholder="/qr-code.png" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 font-display text-sm font-semibold">WhatsApp Notifications</h3>
                      <div>
                        <Label className="text-xs">WhatsApp Phone (with country code, no +)</Label>
                        <Input value={settingsForm.whatsapp_phone ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp_phone: e.target.value })} placeholder="917858093865" />
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 font-display text-sm font-semibold">Email (Zoho Mail — future)</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Zoho SMTP Host</Label>
                          <Input value={settingsForm.zoho_smtp_host ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, zoho_smtp_host: e.target.value })} placeholder="smtp.zoho.in" />
                        </div>
                        <div>
                          <Label className="text-xs">Zoho SMTP Port</Label>
                          <Input value={settingsForm.zoho_smtp_port ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, zoho_smtp_port: e.target.value })} placeholder="587" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Zoho Sender Email</Label>
                          <Input value={settingsForm.zoho_email ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, zoho_email: e.target.value })} placeholder="noreply@onlineprint4u.in" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 font-display text-sm font-semibold">Firebase Phone Auth</h3>
                      <div>
                        <Label className="text-xs">Firebase Phone Auth Enabled (true/false)</Label>
                        <Input value={settingsForm.firebase_phone_auth_enabled ?? ''} onChange={(e) => setSettingsForm({ ...settingsForm, firebase_phone_auth_enabled: e.target.value })} placeholder="false" />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Set to 'true' when Firebase Phone Auth is activated. Supabase Phone Auth is used by default.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
}
