import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  MapPin,
  LayoutDashboard,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  XCircle,
  Download,
  Plus,
  Trash2,
  Edit2,
  Star,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase, type Order, type Address } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatINR } from '@/lib/pricing';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { icon: typeof Package; color: string; label: string }> = {
  placed: { icon: Clock, color: 'bg-blue-500/10 text-blue-600', label: 'Order Placed' },
  processing: { icon: Printer, color: 'bg-amber-500/10 text-amber-600', label: 'Processing' },
  printed: { icon: FileText, color: 'bg-purple-500/10 text-purple-600', label: 'Printed' },
  shipped: { icon: Truck, color: 'bg-sky-500/10 text-sky-600', label: 'Shipped' },
  delivered: { icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'bg-destructive/10 text-destructive', label: 'Cancelled' },
};

const trackingSteps = ['placed', 'processing', 'printed', 'shipped', 'delivered'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddr, setEditingAddr] = useState<Address | null>(null);
  const [addrForm, setAddrForm] = useState({
    label: 'Home',
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?redirect=/dashboard');
      return;
    }
    Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false })
        .then(({ data }) => data as Order[] | null),
      supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false })
        .then(({ data }) => data as Address[] | null),
    ]).then(([o, a]) => {
      if (o) setOrders(o);
      if (a) setAddresses(a);
      setLoading(false);
    });
  }, [user, authLoading, navigate]);

  const handleSaveAddress = async () => {
    if (!user) return;
    if (!addrForm.name || !addrForm.phone || !addrForm.line1 || !addrForm.city || !addrForm.state || !addrForm.pincode) {
      toast.error('Please fill in all address fields.');
      return;
    }
    try {
      if (editingAddr) {
        const { error } = await supabase
          .from('addresses')
          .update({
            label: addrForm.label,
            name: addrForm.name,
            phone: addrForm.phone,
            line1: addrForm.line1,
            line2: addrForm.line2,
            city: addrForm.city,
            state: addrForm.state,
            pincode: addrForm.pincode,
          })
          .eq('id', editingAddr.id);
        if (error) throw error;
        toast.success('Address updated.');
      } else {
        const { error } = await supabase.from('addresses').insert({
          user_id: user.uid,
          ...addrForm,
        });
        if (error) throw error;
        toast.success('Address saved.');
      }
      setShowAddrForm(false);
      setEditingAddr(null);
      setAddrForm({ label: 'Home', name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.uid)
        .order('created_at', { ascending: false });
      if (data) setAddresses(data as Address[]);
    } catch {
      toast.error('Failed to save address.');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success('Address deleted.');
    } catch {
      toast.error('Failed to delete address.');
    }
  };

  const handleDownloadInvoice = (order: Order) => {
    const invoice = generateInvoiceHTML(order, profile?.full_name ?? '');
    const blob = new Blob([invoice], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${order.order_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Invoice downloaded.');
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </main>
      </>
    );
  }

  const totalSpent = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.total, 0);
  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.order_status)
  ).length;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-muted/30 py-10">
        <div className="container mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold">
              Welcome, {profile?.full_name?.split(' ')[0] ?? 'User'}!
            </h1>
            <p className="mt-1 text-muted-foreground">Manage your orders, addresses, and invoices.</p>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Package className="h-6 w-6" />
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
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Orders</p>
                  <p className="font-display text-2xl font-bold">{activeOrders}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="font-display text-2xl font-bold">{formatINR(totalSpent)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="orders">
            <TabsList className="mb-6 grid w-full grid-cols-2 sm:w-auto sm:grid-cols-3">
              <TabsTrigger value="orders" className="gap-1.5">
                <Package className="h-4 w-4" /> Orders
              </TabsTrigger>
              <TabsTrigger value="addresses" className="gap-1.5">
                <MapPin className="h-4 w-4" /> Addresses
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-1.5">
                <Truck className="h-4 w-4" /> Tracking
              </TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-4">
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Package className="mb-3 h-12 w-12 text-muted-foreground/40" />
                    <p className="font-display text-lg font-semibold">No orders yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Start printing to see your orders here.</p>
                    <Link to="/print" className="mt-4">
                      <Button className="gap-2">
                        <FileText className="h-4 w-4" /> Upload &amp; Print
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                orders.map((order) => {
                  const StatusIcon = statusConfig[order.order_status]?.icon ?? Clock;
                  return (
                    <Card key={order.id}>
                      <CardContent className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="font-mono text-sm font-semibold">{order.order_number}</p>
                              <Badge variant="secondary" className={cn('gap-1', statusConfig[order.order_status]?.color)}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig[order.order_status]?.label}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {' • '}
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                              {' • '}
                              {order.payment_method === 'cod' ? 'COD' : order.payment_method === 'advance' ? '50% Advance' : '100% Online'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-lg font-bold text-primary">{formatINR(order.total)}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {order.items.slice(0, 3).map((item, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs">
                              <FileText className="h-3 w-3 text-primary" />
                              <span className="max-w-32 truncate">{item.fileName}</span>
                              <span className="text-muted-foreground">{item.copies}x</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="flex items-center rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                              +{order.items.length - 3} more
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleDownloadInvoice(order)}
                          >
                            <Download className="h-3.5 w-3.5" /> Invoice
                          </Button>
                          <Link to={`/order/success?id=${order.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1.5">
                              <Truck className="h-3.5 w-3.5" /> Track
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses" className="space-y-4">
              {!showAddrForm && (
                <Button
                  onClick={() => {
                    setEditingAddr(null);
                    setAddrForm({
                      label: 'Home',
                      name: profile?.full_name ?? '',
                      phone: profile?.phone ?? '',
                      line1: '',
                      line2: '',
                      city: '',
                      state: '',
                      pincode: '',
                    });
                    setShowAddrForm(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Add New Address
                </Button>
              )}

              {showAddrForm && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="mb-4 font-display text-lg font-bold">
                      {editingAddr ? 'Edit Address' : 'New Address'}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={addrForm.label}
                          onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                          placeholder="Home, Office, etc."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={addrForm.name}
                          onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          value={addrForm.phone}
                          onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PIN Code</Label>
                        <Input
                          value={addrForm.pincode}
                          onChange={(e) =>
                            setAddrForm({ ...addrForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })
                          }
                          maxLength={6}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Address Line 1</Label>
                        <Input
                          value={addrForm.line1}
                          onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Address Line 2 (optional)</Label>
                        <Input
                          value={addrForm.line2}
                          onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={addrForm.city}
                          onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input
                          value={addrForm.state}
                          onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button onClick={handleSaveAddress}>Save Address</Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddrForm(false);
                          setEditingAddr(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map((addr) => (
                  <Card key={addr.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-display text-sm font-semibold">{addr.label}</p>
                            {addr.is_default && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingAddr(addr);
                              setAddrForm({
                                label: addr.label,
                                name: addr.name,
                                phone: addr.phone,
                                line1: addr.line1,
                                line2: addr.line2 ?? '',
                                city: addr.city,
                                state: addr.state,
                                pincode: addr.pincode,
                              });
                              setShowAddrForm(true);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{addr.name}</p>
                        <p>{addr.line1}{addr.line2 ? ', ' + addr.line2 : ''}</p>
                        <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p>{addr.phone}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tracking Tab */}
            <TabsContent value="tracking" className="space-y-4">
              {orders.filter((o) => !['cancelled'].includes(o.order_status)).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Truck className="mb-3 h-12 w-12 text-muted-foreground/40" />
                    <p className="font-display text-lg font-semibold">No active orders to track</p>
                    <Link to="/print" className="mt-4">
                      <Button className="gap-2">
                        <FileText className="h-4 w-4" /> Start Printing
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                orders
                  .filter((o) => !['cancelled'].includes(o.order_status))
                  .map((order) => {
                    const currentStep = trackingSteps.indexOf(order.order_status);
                    return (
                      <Card key={order.id}>
                        <CardContent className="p-6">
                          <div className="mb-6 flex items-center justify-between">
                            <div>
                              <p className="font-mono text-sm font-semibold">{order.order_number}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.items.length} items • {formatINR(order.total)}
                              </p>
                            </div>
                            <Badge variant="secondary" className={statusConfig[order.order_status]?.color}>
                              {statusConfig[order.order_status]?.label}
                            </Badge>
                          </div>

                          {/* Tracking timeline */}
                          <div className="flex items-center">
                            {trackingSteps.map((status, i) => {
                              const Icon = statusConfig[status]?.icon ?? Clock;
                              const done = i <= currentStep;
                              return (
                                <div key={status} className="flex flex-1 flex-col items-center">
                                  <div className="flex w-full items-center">
                                    {i > 0 && (
                                      <div
                                        className={cn(
                                          'h-1 flex-1',
                                          i <= currentStep ? 'bg-primary' : 'bg-border'
                                        )}
                                      />
                                    )}
                                    <div
                                      className={cn(
                                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                                        done
                                          ? 'border-primary bg-primary text-primary-foreground'
                                          : 'border-border bg-background text-muted-foreground'
                                      )}
                                    >
                                      <Icon className="h-4 w-4" />
                                    </div>
                                    {i < trackingSteps.length - 1 && (
                                      <div
                                        className={cn(
                                          'h-1 flex-1',
                                          i < currentStep ? 'bg-primary' : 'bg-border'
                                        )}
                                      />
                                    )}
                                  </div>
                                  <p className={cn(
                                    'mt-2 text-center text-xs',
                                    done ? 'font-semibold text-foreground' : 'text-muted-foreground'
                                  )}>
                                    {statusConfig[status]?.label}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {order.tracking_id && (
                            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
                              <span className="text-muted-foreground">Tracking ID: </span>
                              <span className="font-mono font-semibold">{order.tracking_id}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
}

function generateInvoiceHTML(order: Order, customerName: string): string {
  const items = order.items as Array<{
    fileName: string;
    pages: number;
    copies: number;
    printType: string;
    side: string;
    paperGsm: string;
    binding: string;
    premiumPhoto: boolean;
    price: number;
  }>;

  const itemRows = items.map((item) => {
    const sideLabel = item.side === 'double' ? 'Both Sides' : 'One Side';
    const typeLabel = item.printType === 'bw' ? 'B&W' : 'Color';
    const totalPages = item.pages * item.copies;
    const perPageRate = totalPages > 0 ? item.price / totalPages : 0;
    return `
      <tr>
        <td>${item.fileName}</td>
        <td>${item.pages}</td>
        <td>${item.copies}</td>
        <td>${typeLabel} (${sideLabel})</td>
        <td>${item.paperGsm} GSM</td>
        <td>${item.binding}</td>
        <td style="text-align:right">₹${perPageRate.toFixed(2)}</td>
        <td style="text-align:right">₹${item.price.toFixed(2)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice - ${order.order_number}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a202c; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
  .invoice-title { font-size: 28px; font-weight: bold; }
  .section { margin-bottom: 20px; }
  .section h3 { color: #2563eb; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 13px; }
  td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .totals { margin-left: auto; width: 300px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #2563eb; padding-top: 12px; font-size: 18px; font-weight: bold; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">ONLINE PRINT 4U</div>
      <p style="font-size:12px;color:#64748b;margin-top:4px">Fast, Easy & Reliable Online Document Printing</p>
    </div>
    <div style="text-align:right">
      <div class="invoice-title">INVOICE</div>
      <p style="font-size:13px;color:#64748b">${order.order_number}</p>
      <p style="font-size:13px;color:#64748b">${new Date(order.created_at).toLocaleDateString('en-IN')}</p>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:30px">
    <div class="section">
      <h3>Bill To</h3>
      <p style="font-size:14px"><strong>${customerName}</strong></p>
      <p style="font-size:13px;color:#64748b">${order.shipping_address}</p>
      <p style="font-size:13px;color:#64748b">${order.shipping_phone}</p>
    </div>
    <div class="section">
      <h3>Payment</h3>
      <p style="font-size:13px">Method: ${order.payment_method === 'cod' ? '50% Advance Paid & 50% on Delivery' : order.payment_method === 'advance' ? '50% Advance Paid (Online)' : '100% Full Online Payment'}</p>
      <p style="font-size:13px">Status: ${order.payment_status}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Document</th>
        <th>Pages</th>
        <th>Copies</th>
        <th>Print Type</th>
        <th>Paper</th>
        <th>Binding</th>
        <th style="text-align:right">Rate/Page</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>₹${order.subtotal.toFixed(2)}</span></div>
    ${order.discount > 0 ? `<div><span>Discount ${order.coupon_code ? '(' + order.coupon_code + ')' : ''}</span><span>-₹${order.discount.toFixed(2)}</span></div>` : ''}
    <div><span>Shipping</span><span>₹${order.shipping_cost.toFixed(2)}</span></div>
    <div class="grand"><span>Total</span><span>₹${order.total.toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <p>Thank you for choosing ONLINE PRINT 4U!</p>
    <p>For support: contact@onlineprint4u.in • +91 7858093865</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
  </div>
</body>
</html>`;
}
