import { useState, useEffect, useCallback } from 'react';
import { Calculator, X, Minus, Plus, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { formatINR, PAPER_GSM_OPTIONS, BINDING_OPTIONS } from '@/lib/pricing';
import { getActivePricingRates, getActiveShippingRates, isFirebaseConfigured, type PricingRate, type ShippingRate } from '@/lib/database';
import { siteConfig } from '@/lib/site-config';
import { isValidWhatsAppPhone } from '@/lib/whatsapp';

function getRatePrice(rates: PricingRate[], category: string, key: string): number {
  return rates.find((r) => r.category === category && r.key === key)?.price ?? 0;
}

function getPrintRate(rates: PricingRate[], gsm: string, printType: 'bw' | 'color', side: 'single' | 'double'): number {
  return getRatePrice(rates, 'print_per_page', `${gsm}_${printType}_${side}`);
}

function getBindingPrice(rates: PricingRate[], binding: string): number {
  return getRatePrice(rates, 'binding', binding);
}

function getDeliveryCharge(shippingRates: ShippingRate[], courierType: string): number {
  const rate = shippingRates.find((s) => s.courier_type === courierType);
  return rate?.base_rate ?? 69;
}

interface Result {
  perPageRate: number;
  printingCost: number;
  bindingCost: number;
  photoCost: number;
  deliveryCharge: number;
  grandTotal: number;
}

export function FloatingWidgets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const [pages, setPages] = useState('');
  const [pincode, setPincode] = useState('');
  const [printType, setPrintType] = useState<'bw' | 'color'>('bw');
  const [gsm, setGsm] = useState<string>('70');
  const [binding, setBinding] = useState<string>('none');
  const [copies, setCopies] = useState(1);
  const [doubleSide, setDoubleSide] = useState(false);
  const [premiumPhoto, setPremiumPhoto] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  const [rates, setRates] = useState<PricingRate[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    getActivePricingRates().then(setRates).catch(() => {});
    getActiveShippingRates().then(setShippingRates).catch(() => {});
  }, []);

  const calculate = useCallback(() => {
    const totalPages = parseInt(pages, 10);
    if (!pages || isNaN(totalPages) || totalPages < 1) {
      setError('Please enter a valid number of pages.');
      return;
    }
    setError('');

    const side: 'single' | 'double' = doubleSide ? 'double' : 'single';
    const printRate = getPrintRate(rates, gsm, printType, side);
    const bindingPrice = getBindingPrice(rates, binding);
    const photoRate = getRatePrice(rates, 'addons', 'premium_photo');

    const printingCost = Math.round(totalPages * copies * printRate * 100) / 100;
    const bindingCost = Math.round(bindingPrice * copies * 100) / 100;
    const photoCost = premiumPhoto ? Math.round(totalPages * copies * photoRate * 100) / 100 : 0;

    const courierType = 'local';
    const deliveryCharge = getDeliveryCharge(shippingRates, courierType);

    const subtotal = printingCost + bindingCost + photoCost + deliveryCharge;
    const grandTotal = Math.round(subtotal * 100) / 100;

    setResult({ perPageRate: printRate, printingCost, bindingCost, photoCost, deliveryCharge, grandTotal });
  }, [pages, pincode, printType, gsm, binding, copies, doubleSide, premiumPhoto, rates, shippingRates]);

  const bwStart = rates.length > 0 ? getPrintRate(rates, '70', 'bw', 'single') : 0.90;
  const colorStart = rates.length > 0 ? getPrintRate(rates, '70', 'color', 'double') : 4.0;

  return (
    <>
      <div className="fixed bottom-6 left-4 z-50 flex flex-col items-center gap-0 select-none">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Print Cost Calculator"
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#2563EB] text-white shadow-lg transition-transform duration-200 hover:scale-110 hover:-rotate-3 active:scale-95"
          style={{ transform: 'rotate(-4deg)' }}
        >
          <Calculator className="h-5 w-5" />
        </button>
        <button
          onClick={() => setOpen(true)}
          aria-label="Get Estimates"
          className="relative mt-0.5 cursor-pointer rounded-sm border-2 border-[#2563EB]/60 bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#92400E] shadow-md transition-all duration-200 hover:shadow-lg active:scale-95"
          style={{ transform: 'rotate(3deg)', animation: 'estimate-tag-float 3s ease-in-out infinite' }}
        >
          Get estimates
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-[#2563EB] border border-white shadow" />
        </button>
      </div>

      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-center gap-2">
        {!user && (
          <button
            onClick={() => navigate('/login')}
            aria-label="Login"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            <LogIn className="h-5 w-5" />
          </button>
        )}
        {isValidWhatsAppPhone(siteConfig.contact.phoneRaw) && (
          <a
            href={`https://wa.me/${siteConfig.contact.phoneRaw}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-transform duration-200 hover:scale-110 active:scale-95"
            style={{ backgroundColor: '#25D366', animation: 'wa-bounce 3s ease-in-out infinite' }}
          >
            <svg viewBox="0 0 32 32" className="h-8 w-8 fill-white" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.003 2C8.28 2 2 8.28 2 16.003c0 2.478.65 4.806 1.785 6.826L2 30l7.368-1.764A13.94 13.94 0 0016.003 30C23.72 30 30 23.72 30 16.003 30 8.28 23.72 2 16.003 2zm0 25.385a11.31 11.31 0 01-5.776-1.582l-.413-.247-4.37 1.046 1.067-4.258-.27-.436a11.34 11.34 0 01-1.62-5.905C4.621 9.766 9.767 4.62 16.003 4.62c3.024 0 5.866 1.179 8.003 3.319a11.26 11.26 0 013.313 8.064c0 6.237-5.145 11.382-11.316 11.382zm6.231-8.53c-.342-.17-2.022-1-2.338-1.113-.315-.113-.544-.17-.773.171-.23.342-.886 1.113-1.086 1.343-.2.228-.4.257-.742.086-.342-.171-1.445-.532-2.752-1.697-1.017-.908-1.703-2.03-1.903-2.371-.2-.342-.022-.527.15-.697.155-.154.342-.4.513-.6.172-.2.229-.342.342-.57.115-.228.058-.428-.028-.599-.086-.171-.773-1.864-1.059-2.55-.279-.67-.562-.578-.773-.59l-.657-.01c-.228 0-.599.086-.913.427-.314.342-1.2 1.172-1.2 2.857 0 1.686 1.229 3.315 1.4 3.544.171.228 2.42 3.697 5.864 5.184.82.354 1.46.565 1.957.722.823.261 1.572.224 2.164.136.66-.099 2.022-.827 2.308-1.626.285-.8.285-1.484.199-1.627-.085-.143-.313-.228-.656-.399z" />
            </svg>
          </a>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ animation: 'modal-fade-in 0.2s ease-out' }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setOpen(false); setResult(null); setError(''); }}
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ animation: 'modal-scale-in 0.2s ease-out' }}
          >
            <div className="bg-[#2563EB] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calculator className="h-5 w-5 text-white" />
                <h2 className="text-lg font-bold text-white">Print Cost Calculator</h2>
              </div>
              <button
                onClick={() => { setOpen(false); setResult(null); setError(''); }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Total Pages</label>
                  <input
                    type="number"
                    min={1}
                    value={pages}
                    onChange={(e) => { setPages(e.target.value); setResult(null); }}
                    placeholder="e.g. 100"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Delivery Pincode</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => { setPincode(e.target.value.replace(/\D/, '')); setResult(null); }}
                    placeholder="e.g. 800013"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Print Type</label>
                  <div className="flex gap-2">
                    {(['bw', 'color'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setPrintType(t); setResult(null); }}
                        className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${
                          printType === t
                            ? 'border-[#2563EB] bg-[#2563EB] text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-[#2563EB]/50'
                        }`}
                      >
                        {t === 'bw' ? 'B&W' : 'Color'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    {printType === 'bw'
                      ? `Starts at ${formatINR(bwStart)}/page`
                      : `Starts at ${formatINR(colorStart)}/page`}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Paper Type</label>
                  <select
                    value={gsm}
                    onChange={(e) => { setGsm(e.target.value); setResult(null); }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                  >
                    {PAPER_GSM_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Binding Type</label>
                  <select
                    value={binding}
                    onChange={(e) => { setBinding(e.target.value); setResult(null); }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                  >
                    {BINDING_OPTIONS.map((b) => (
                      <option key={b.key} value={b.key}>
                        {b.label} {b.key !== 'none' && `(${formatINR(getBindingPrice(rates, b.key))})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Copies</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setCopies((c) => Math.max(1, c - 1)); setResult(null); }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold">{copies}</span>
                    <button
                      onClick={() => { setCopies((c) => c + 1); setResult(null); }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Double-Side Printing</p>
                  <p className="text-xs text-gray-400">Prints on both sides (duplex)</p>
                </div>
                <button
                  role="switch"
                  aria-checked={doubleSide}
                  onClick={() => { setDoubleSide((d) => !d); setResult(null); }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    doubleSide ? 'bg-[#2563EB]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      doubleSide ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Premium Photo Prints</p>
                  <p className="text-xs text-gray-400">₹25/page for photo-quality printing</p>
                </div>
                <button
                  role="switch"
                  aria-checked={premiumPhoto}
                  onClick={() => { setPremiumPhoto((p) => !p); setResult(null); }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    premiumPhoto ? 'bg-[#2563EB]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      premiumPhoto ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

              <button
                onClick={calculate}
                className="mt-4 w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
              >
                <Calculator className="h-4 w-4" />
                Calculate Price
              </button>

              {result && (
                <div
                  className="mt-5 rounded-xl border border-[#2563EB]/20 bg-blue-50 p-4 space-y-2"
                  style={{ animation: 'modal-scale-in 0.18s ease-out' }}
                >
                  <p className="text-sm font-semibold text-[#2563EB] mb-3">Cost Breakdown</p>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Per-Page Rate</span>
                    <span className="font-medium">{formatINR(result.perPageRate)}</span>
                  </div>
                  {([
                    ['Printing Cost', result.printingCost],
                    ['Binding Cost', result.bindingCost],
                    ...(result.photoCost > 0 ? [['Photo Print Cost', result.photoCost] as [string, number]] : []),
                    ['Delivery Charges', result.deliveryCharge],
                  ] as [string, number][]).map(([label, val]) => (
                    <div key={label} className="flex justify-between text-sm text-gray-700">
                      <span>{label}</span>
                      <span className="font-medium">{formatINR(val)}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#2563EB]/20 pt-2 flex justify-between text-base font-bold text-[#2563EB]">
                    <span>Grand Total</span>
                    <span>{formatINR(result.grandTotal)}</span>
                  </div>
                  <p className="text-xs text-gray-400 pt-1">* Estimate only. Final price may vary by file count &amp; weight.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
