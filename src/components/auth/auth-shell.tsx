import { Link } from 'react-router-dom';
import { Logo } from '@/components/logo';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="grid flex-1 lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-secondary p-12 text-secondary-foreground lg:flex">
          <div className="absolute inset-0 hero-grid opacity-20" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <Logo className="[&_span]:text-white" size="lg" />
          </div>
          <div className="relative space-y-6">
            <h2 className="font-display text-3xl font-bold text-white">
              Fast, Easy &amp; Reliable Online Document Printing
            </h2>
            <p className="text-secondary-foreground/70">
              Join thousands of customers who trust Online Print 4U for their printing needs.
              Upload, customize, and get doorstep delivery across India.
            </p>
            <div className="space-y-3">
              {[
                'Instant live pricing',
                'WhatsApp order updates',
                'Invoices included',
                'Pan-India courier delivery',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-secondary-foreground/90">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="relative text-xs text-secondary-foreground/50">
            © {new Date().getFullYear()} Online Print 4U. All rights reserved.
          </p>
        </div>

        <div className="flex items-center justify-center bg-background p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link to="/">
                <Logo />
              </Link>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
