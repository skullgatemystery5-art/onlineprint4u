import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  Settings2,
  Truck,
  ArrowRight,
  Star,
  ShieldCheck,
  Zap,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const stats = [
  { value: '50K+', label: 'Documents Printed' },
  { value: '12K+', label: 'Happy Customers' },
  { value: '24/7', label: 'Online Ordering' },
  { value: '500+', label: 'Cities Served' },
];

const steps = [
  { icon: Upload, title: 'Upload', desc: 'Drag & drop your documents' },
  { icon: Settings2, title: 'Customize', desc: 'Choose print options' },
  { icon: FileText, title: 'Print', desc: 'We print with precision' },
  { icon: Truck, title: 'Deliver', desc: 'Doorstep courier delivery' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-grid absolute inset-0 opacity-50" />
      <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-radial from-primary/20 via-primary/5 to-transparent blur-3xl" />

      <div className="container relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary animate-fade-in">
            <Zap className="h-3.5 w-3.5" />
            Instant pricing • Doorstep delivery
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl animate-fade-up">
            Online Print <span className="gradient-text">4U</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-balance sm:text-xl animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Fast, Easy &amp; Reliable Online Document Printing. Upload your files,
            customize options, and get them printed and delivered to your door.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/print">
              <Button size="lg" className="group w-full gap-2 sm:w-auto">
                <Upload className="h-4 w-4" />
                Upload &amp; Print Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/#rate-card">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                View Rate Card
              </Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-4xl animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="group relative rounded-2xl border border-border bg-card p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-sm font-semibold">{step.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{step.desc}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/40 sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-2xl font-bold text-primary sm:text-3xl">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" /> Secure checkout
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500" /> 4.8/5 customer rating
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" /> 24-hour turnaround
          </span>
        </div>
      </div>
    </section>
  );
}
