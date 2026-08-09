import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, MessageCircle, Printer, FileText, Shield, Truck } from 'lucide-react';
import { Logo } from '@/components/logo';

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary text-secondary-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo className="[&_span]:text-white" />
            <p className="text-sm leading-relaxed text-secondary-foreground/70">
              Fast, Easy &amp; Reliable Online Document Printing. Upload your files,
              customize print options, and get doorstep delivery across India.
            </p>
            <div className="flex gap-3">
              <a
                href="https://wa.me/917858093865"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href="mailto:contact@onlineprint4u.in"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
              <a
                href="tel:+917858093865"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Phone"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
              Services
            </h3>
            <ul className="space-y-2.5 text-sm text-secondary-foreground/70">
              <li><Link to="/print" className="hover:text-white transition-colors">Document Printing</Link></li>
              <li><Link to="/print" className="hover:text-white transition-colors">Color Printing</Link></li>
              <li><Link to="/print" className="hover:text-white transition-colors">Binding & Lamination</Link></li>
              <li><Link to="/print" className="hover:text-white transition-colors">Bulk Printing</Link></li>
              <li><Link to="/print" className="hover:text-white transition-colors">Doorstep Delivery</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
              Company
            </h3>
            <ul className="space-y-2.5 text-sm text-secondary-foreground/70">
              <li><Link to="/#why-us" className="hover:text-white transition-colors">Why Choose Us</Link></li>
              <li><Link to="/#process" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/#rate-card" className="hover:text-white transition-colors">Rate Card</Link></li>
              <li><Link to="/#reviews" className="hover:text-white transition-colors">Reviews</Link></li>
              <li><Link to="/#faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/#contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-white">
              Get in Touch
            </h3>
            <ul className="space-y-3 text-sm text-secondary-foreground/70">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Partliputra Colony, Near Ruban Hospital, Patna-800013</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>+91 7858093865</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>contact@onlineprint4u.in</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-secondary-foreground/60">
            © {new Date().getFullYear()} Online Print 4U. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-secondary-foreground/60">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Secure Payments</span>
            <span className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-primary" /> Pan-India Delivery</span>
            <span className="flex items-center gap-1.5"><Printer className="h-3.5 w-3.5 text-primary" /> Quality Printing</span>
            <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /> Invoices Included</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
