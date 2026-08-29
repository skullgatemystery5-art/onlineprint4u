import { X, Info, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RATE_CARD, BINDING_RATE_CARD, formatINR } from '@/lib/pricing';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function RateChartModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Complete Rate Card
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Transparent pricing for every print job
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No hidden charges. Choose your paper type, print mode, and binding to see your exact cost.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Printing Cost Per Page */}
        <section className="mb-6">
          <h3 className="mb-1 font-display text-lg font-bold">Printing Cost Per Page (India)</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Rates shown per printed page. &ldquo;Both Sides&rdquo; = duplex printing, &ldquo;One Side&rdquo; = single-sided.
          </p>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left font-display font-semibold">Paper Type</th>
                  <th className="px-4 py-3 text-center font-display font-semibold">B&amp;W (One Side)</th>
                  <th className="px-4 py-3 text-center font-display font-semibold">B&amp;W (Both Sides)</th>
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
                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-primary">
                      {formatINR(row.colorSingle)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-primary">
                      {formatINR(row.colorDouble)}
                    </td>
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
                    <span className="text-muted-foreground">B&amp;W Single</span>
                    <span className="font-semibold tabular-nums">{formatINR(row.bwSingle)}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">B&amp;W Double</span>
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
        </section>

        {/* Binding & Add-ons */}
        <section className="mb-6">
          <h3 className="mb-1 font-display text-lg font-bold">Binding &amp; Add-ons</h3>
          <p className="mb-4 text-xs text-muted-foreground">Per-copy flat rates applied at checkout.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BINDING_RATE_CARD.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:border-primary/40"
              >
                <span className="font-display text-sm font-medium">{item.label}</span>
                <span className="font-bold tabular-nums text-primary">
                  {formatINR(item.price)}
                  <span className="text-xs font-normal text-muted-foreground">/{item.unit ?? 'copy'}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Notes */}
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1.5 text-sm text-foreground">
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
                &ldquo;Both Sides&rdquo; refers to duplex printing, and &ldquo;One Side&rdquo; refers to single-sided printing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/print" className="flex-1">
            <Button className="w-full gap-2">
              <Upload className="h-4 w-4" />
              Upload &amp; Print Now
            </Button>
          </Link>
          <Button variant="outline" onClick={onClose} className="sm:flex-none">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
