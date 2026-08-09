import {
  Bike,
  Truck,
  Plane,
  Store,
  ShieldCheck,
  Lock,
  Package,
  MapPin,
  Clock,
  MessageCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/lib/site-config';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ShippingPolicyModal({ open, onClose }: Props) {
  if (!open) return null;

  const timelines = [
    { icon: Bike, title: 'Local Express Delivery', time: '2-6 hours', desc: 'Within Patna city limits via in-house delivery team' },
    { icon: Truck, title: 'Standard National Courier', time: '3-5 working days', desc: 'Surface shipping to any valid Indian pincode' },
    { icon: Plane, title: 'Express Air Courier', time: '1-2 working days', desc: 'Air shipping for urgent outstation deliveries' },
    { icon: Store, title: 'Store / Self Pickup', time: 'Ready in 24 hours', desc: 'Collect from our store at no extra cost' },
  ];

  const packagingLayers = [
    { title: 'Waterproof Shield', desc: 'Moisture-resistant outer wrapping protects documents from rain and spills' },
    { title: '2mm Anti-Bending Greyboard', desc: 'Rigid sandwich sheets prevent folding, creasing, and bending during transit' },
    { title: 'Tamper-Proof Poly Bag', desc: 'Sealed courier envelope ensures your documents reach you unopened and intact' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Shipping, Delivery &amp; Packaging Policy</h2>
            <p className="mt-1 text-sm text-muted-foreground">Everything you need to know about how we deliver your documents safely</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Delivery Timelines */}
        <section className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Clock className="h-5 w-5 text-primary" /> Delivery Timelines
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {timelines.map((t) => (
              <div key={t.title} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <t.icon className="h-4 w-4 text-primary" />
                  <p className="font-medium text-sm">{t.title}</p>
                </div>
                <p className="mt-1 text-xs font-semibold text-primary">{t.time}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tri-Layer Packaging */}
        <section className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Package className="h-5 w-5 text-primary" /> Tri-Layer Zero-Damage Packaging
          </h3>
          <div className="space-y-3">
            {packagingLayers.map((layer, i) => (
              <div key={layer.title} className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{layer.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{layer.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm font-medium text-emerald-700">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            100% Zero-Damage Guarantee — Your documents arrive in perfect condition
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <Lock className="h-5 w-5 text-primary" /> Document Privacy Guarantee
          </h3>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Your files are processed in a secure environment and automatically deleted from our servers
              after printing is completed. We do not store, share, or access your document contents beyond
              what is required to fulfill your order.
            </p>
          </div>
        </section>

        {/* Order Tracking */}
        <section className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <MessageCircle className="h-5 w-5 text-primary" /> Order Live Tracking
          </h3>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Track your order status in real-time via WhatsApp and SMS notifications. You will receive
              updates at every stage — order confirmed, printing in progress, dispatched, and delivered.
              You can also check your order status anytime from your dashboard.
            </p>
          </div>
        </section>

        {/* Store Location */}
        <section>
          <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <MapPin className="h-5 w-5 text-primary" /> Our Store Location
          </h3>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">{siteConfig.brandName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{siteConfig.contact.address}</p>
            <p className="mt-1 text-sm text-muted-foreground">Phone: {siteConfig.contact.phone}</p>
            <div className="mt-3 flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
              <div className="text-center">
                <MapPin className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="mt-1 text-xs text-muted-foreground">Google Maps embed will appear here</p>
              </div>
            </div>
          </div>
        </section>

        <Button onClick={onClose} className="mt-6 w-full">Got it</Button>
      </div>
    </div>
  );
}
