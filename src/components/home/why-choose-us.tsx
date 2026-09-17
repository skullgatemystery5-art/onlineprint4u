import {
  Zap, ShieldCheck, IndianRupee, Truck, Headphones, Clock, Award, Smartphone,
} from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', desc: 'Upload, customize, and order in under 2 minutes. Most orders printed within 24 hours.' },
  { icon: IndianRupee, title: 'Transparent Pricing', desc: 'Live price calculator shows every cost component. No hidden charges, no surprises.' },
  { icon: ShieldCheck, title: 'Secure & Private', desc: 'Your files are encrypted and auto-deleted after printing. We never share your data.' },
  { icon: Truck, title: 'Pan-India Delivery', desc: 'Doorstep courier delivery to 500+ cities with real-time tracking.' },
  { icon: Award, title: 'Premium Quality', desc: 'High-resolution printers, premium paper, and professional binding options.' },
  { icon: Smartphone, title: 'WhatsApp Updates', desc: 'Get automatic order updates on WhatsApp at every stage — from print to delivery.' },
  { icon: Headphones, title: '24/7 Support', desc: 'Reach us anytime via WhatsApp, email, or phone. We are always here to help.' },
  { icon: Clock, title: 'Flexible Options', desc: 'Color or B&W, multiple paper types, binding, lamination — all customizable.' },
];

export function WhyChooseUs() {
  return (
    <section id="why-us" className="py-20">
      <div className="container mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">Why Choose Us</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            The smartest way to get your documents printed
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need for professional document printing, delivered to your door.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-glow animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
