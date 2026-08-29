import type { OrderItem, PricingRate, ShippingRate, Coupon, PaperGsm } from './supabase';

export const PAPER_GSM_OPTIONS: { value: PaperGsm; label: string }[] = [
  { value: '70', label: '70 GSM Economy' },
  { value: '75', label: '75 GSM Standard' },
  { value: '85', label: '85 GSM Plus' },
  { value: '100', label: '100 GSM Premium' },
];

export const BINDING_OPTIONS: {
  key: OrderItem['binding'];
  label: string;
  price: number;
  priceLabel: string;
}[] = [
  { key: 'none', label: 'No Binding', price: 0, priceLabel: '₹0.00' },
  { key: 'spiral', label: 'Spiral Binding', price: 40, priceLabel: '₹40.00 / copy' },
  { key: 'soft', label: 'Soft Binding', price: 100, priceLabel: '₹100.00 / copy' },
  { key: 'hard', label: 'Hard Binding', price: 100, priceLabel: '₹100.00 / copy' },
  { key: 'thesis', label: 'Thesis Hard Binding', price: 350, priceLabel: '₹350.00 / copy' },
];

export const PREMIUM_PHOTO_RATE = 25;

// Hardcoded print-per-page rates keyed by `${gsm}_${printType}_${side}`
export const PRINT_RATES: Record<string, number> = {
  '70_bw_single': 0.90,
  '70_bw_double': 0.45,
  '70_color_single': 5.00,
  '70_color_double': 4.00,
  '75_bw_single': 1.00,
  '75_bw_double': 0.60,
  '75_color_single': 6.00,
  '75_color_double': 5.00,
  '85_bw_single': 1.70,
  '85_bw_double': 1.50,
  '85_color_single': 7.00,
  '85_color_double': 6.00,
  '100_bw_single': 3.00,
  '100_bw_double': 2.50,
  '100_color_single': 8.00,
  '100_color_double': 7.00,
};

export const BINDING_RATES: Record<string, number> = {
  none: 0,
  spiral: 40,
  soft: 100,
  hard: 100,
  thesis: 350,
};

export function getPrintRateLocal(gsm: PaperGsm, printType: 'bw' | 'color', side: 'single' | 'double'): number {
  return PRINT_RATES[`${gsm}_${printType}_${side}`] ?? 0;
}

export function getBindingPriceLocal(binding: OrderItem['binding']): number {
  return BINDING_RATES[binding] ?? 0;
}

export type PriceBreakdown = {
  printingCost: number;
  bindingCost: number;
  laminationCost: number;
  photoCost: number;
  itemTotal: number;
};

function getPrintRateKey(gsm: PaperGsm, printType: 'bw' | 'color', side: 'single' | 'double'): string {
  return `${gsm}_${printType}_${side}`;
}

export function calculateItemPrice(
  item: Omit<OrderItem, 'price'>,
  rates: PricingRate[]
): PriceBreakdown {
  const get = (category: string, key: string) =>
    rates.find((r) => r.category === category && r.key === key)?.price ?? 0;

  const printRateKey = getPrintRateKey(item.paperGsm, item.printType, item.side);
  const printRate = get('print_per_page', printRateKey);
  const bindingRate = get('binding', item.binding);
  const laminationRate = get('lamination', item.lamination);
  const photoRate = get('addons', 'premium_photo');

  const printingCost = printRate * item.pages * item.copies;
  const bindingCost = bindingRate * item.copies;
  const laminationCost = laminationRate * item.copies;
  const photoCost = item.premiumPhoto ? photoRate * item.pages * item.copies : 0;

  const itemTotal = printingCost + bindingCost + laminationCost + photoCost;

  return {
    printingCost,
    bindingCost,
    laminationCost,
    photoCost,
    itemTotal,
  };
}

export function calculateItemPriceLocal(item: Omit<OrderItem, 'price'>): PriceBreakdown {
  const printRate = getPrintRateLocal(item.paperGsm, item.printType, item.side);
  const bindingRate = getBindingPriceLocal(item.binding);

  const printingCost = printRate * item.pages * item.copies;
  const bindingCost = bindingRate * item.copies;
  const laminationCost = 0;
  const photoCost = item.premiumPhoto ? PREMIUM_PHOTO_RATE * item.pages * item.copies : 0;

  const itemTotal = printingCost + bindingCost + laminationCost + photoCost;

  return {
    printingCost,
    bindingCost,
    laminationCost,
    photoCost,
    itemTotal,
  };
}

export type CartTotal = {
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
};

export function calculateCartTotal(
  items: OrderItem[],
  coupon: Coupon | null,
  shippingRate: ShippingRate | null,
  weightKg: number
): CartTotal {
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  let discount = 0;
  if (coupon && subtotal >= coupon.min_order) {
    if (coupon.discount_type === 'flat') {
      discount = coupon.value;
    } else {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
    }
    discount = Math.min(discount, subtotal);
  }

  const discountedAmount = subtotal - discount;

  const shippingCost = shippingRate ? shippingRate.base_rate : 0;

  const total = Math.max(0, Math.round(discountedAmount + shippingCost));

  return {
    subtotal: Math.round(subtotal),
    discount: Math.round(discount),
    shippingCost: Math.round(shippingCost),
    total,
  };
}

export function estimateWeight(pages: number, copies: number, gsm: string): number {
  const gsmValue = parseInt(gsm, 10) || 75;
  const a4Area = 0.06237;
  const sheetWeight = (a4Area * gsmValue) / 1000;
  return sheetWeight * pages * copies;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export const RATE_CARD = [
  {
    gsm: '70 GSM Economy',
    bwSingle: 0.90,
    bwDouble: 0.45,
    colorSingle: 5.0,
    colorDouble: 4.0,
  },
  {
    gsm: '75 GSM Standard',
    bwSingle: 1.0,
    bwDouble: 0.6,
    colorSingle: 6.0,
    colorDouble: 5.0,
  },
  {
    gsm: '85 GSM Plus',
    bwSingle: 1.7,
    bwDouble: 1.5,
    colorSingle: 7.0,
    colorDouble: 6.0,
  },
  {
    gsm: '100 GSM Premium',
    bwSingle: 3.0,
    bwDouble: 2.5,
    colorSingle: 8.0,
    colorDouble: 7.0,
  },
];

export const BINDING_RATE_CARD = [
  { label: 'Spiral Binding', price: 40 },
  { label: 'Soft Binding', price: 100 },
  { label: 'Hard Binding', price: 100 },
  { label: 'Thesis Hard Binding', price: 350 },
  { label: 'Premium Photo Prints', price: 25, unit: 'page' },
];
