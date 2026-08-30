import { Link } from 'react-router-dom';
import { Info, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RATE_CARD, BINDING_RATE_CARD, formatINR } from '@/lib/pricing';

export function RateCard() {
  return (
    <section id="rate-card" className="py-20">
      <div className="container mx-auto max-w-5xl px-4 lg:px-8">
        <div className="mb-12 text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-primary">Complete Rate Card</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Transparent pricing for every print job
          </h2>
          <p className="mt-3 text-muted-foreground">
            No hidden charges. Choose your paper type, print mode, and binding to see your exact cost.
          </p>
        </div>

        {/* Printing Cost Per Page */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h3 className="mb-1 font-display text-xl font-bold">Printing Cost Per Page (India)</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Rates shown per printed page. "Both Sides" = duplex printing, "One Side" = single-sided.
          </p>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left font-display font-semibold">Paper Type</th>
                  <th className="px-4 py-3 text-center font-display font-semibold">B&W (One Side)</th>
                  <th className="px-4 py-3 text-center font-display font-semibold">B&W (Both Sides)</th>
                  <th className="px-4 py-3 text-center font-display font-semibold">Color (One Side)</th>
                  <th className="px-4 py-3 text-center font-display font-semibold">Color (Both Sides)</th>
                </tr>
              </thead>
              <tbody>
                {RATE_CARD.map((row, i) => (
                  <tr key={row.gsm} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                    <td className="px-4 py-3 font-medium">{row.gsm}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{formatINR(row.bwSingle)}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{formatINR(row.bwDouble)}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-primary font-semibold">{formatINR(row.colorSingle)}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-primary font-semibold">{formatINR(row.colorDouble)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {RATE_CARD.map((row) => (
              <div key={row.gsm} className="rounded-xl border border-border p-4">
                <p className="mb-3 font-display text-sm font-bold">{row.gsm}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">B&W Single</span>
                    <span className="font-semibold tabular-nums">{formatINR(row.bwSingle)}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">B&W Double</span>
                    <span className="font-semibold tabular-nums">{formatINR(row.bwDouble)}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-primary/5 px-3 py-2">
                    <span className="text-muted-foreground">Color Single</span>
                    <span className="font-semibold tabular-nums text-primary">{formatINR(row.colorSingle)}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-primary/5 px-3 py-2">
                    <span className="text-muted-foreground">Color Double</span>
                    <span className="font-semibold tabular-nums text-primary">{formatINR(row.colorDouble)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Binding & Add-ons */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h3 className="mb-1 font-display text-xl font-bold">Binding &amp; Add-ons</h3>
          <p className="mb-6 text-sm text-muted-foreground">Per-copy flat rates applied at checkout.</p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BINDING_RATE_CARD.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:border-primary/40">
                <span className="font-display text-sm font-medium">{item.label}</span>
                <span className="font-bold text-primary tabular-nums">
                  {formatINR(item.price)}<span className="text-xs font-normal text-muted-foreground">/{item.unit ?? 'copy'}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-2 text-sm text-foreground">
              <p>
                <span className="font-semibold">Online Printout Base Rates:</span>{' '}
                Entry-tier B&amp;W starts at ₹0.90/page, and standard color printing starts at ₹4.00/page.
              </p>
              <p>
                <span className="font-semibold">Delivery Charges:</span>{' '}
                Calculated at checkout based on pincode and courier route.
              </p>
              <p>
                <span className="font-semibold">Note:</span>{' '}
                "Both Sides" refers to duplex printing, and "One Side" refers to single-sided printing.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/print">
            <Button size="lg" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload &amp; Print Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
