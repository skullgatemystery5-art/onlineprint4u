import type { OrderItem, PaperGsm } from './database';

// ============================================================
// SHIPPING & DELIVERY MODULE — Zero External API Dependencies
// All weight, pincode, and shipping cost logic is computed locally.
// ============================================================

// --- 1. DYNAMIC PRODUCT WEIGHT & SPECIFICATION MATRIX ---

// Paper weight per A4 page (grams) — per GSM spec
export const PAPER_WEIGHT_PER_PAGE: Record<PaperGsm, number> = {
  '70': 4.4,
  '75': 4.7,
  '85': 5.3,
  '100': 6.3,
};

// Add-on weight contributions (grams)
export const LAMINATION_WEIGHT_PER_PAGE = 10; // 80-125 micron

export type BindingType = OrderItem['binding'];

export const BINDING_WEIGHT: Record<BindingType, number> = {
  none: 0,
  spiral: 70, // Spiral / Comb Binding
  soft: 60, // Soft Binding (Paperback Glue Bound)
  hard: 250, // Normal Hard Binding (Standard Hardcover)
  thesis: 350, // Thesis Hard Binding (Premium Hardcover with Gold/Silver Embossing)
};

// Fixed base packaging weight — always added
// 2mm Anti-Bending Greyboard Sandwich Sheets + Waterproof Poly Courier Bag
export const PACKAGING_BASE_WEIGHT = 90;

// Total weight (in grams) for a single cart item
export function calculateItemWeight(item: OrderItem): number {
  const paperWeight = PAPER_WEIGHT_PER_PAGE[item.paperGsm] ?? 4.7;
  const pagesWeight = paperWeight * item.pages * item.copies;
  const laminationWeight =
    item.lamination === 'transparent' ? LAMINATION_WEIGHT_PER_PAGE * item.pages * item.copies : 0;
  const bindingWeight = BINDING_WEIGHT[item.binding] * item.copies;
  return pagesWeight + laminationWeight + bindingWeight;
}

// Total cart weight (in grams) — includes single packaging base weight
export function calculateCartWeight(items: OrderItem[]): number {
  const itemsWeight = items.reduce((sum, item) => sum + calculateItemWeight(item), 0);
  return itemsWeight + PACKAGING_BASE_WEIGHT;
}

// --- 2. LOCAL PINCODE DETECTION ---

export const PATNA_LOCAL_PINCODES = [
  '800001', '800002', '800003', '800004', '800005',
  '800006', '800007', '800008', '800009', '800010',
  '800011', '800012', '800013', '800014', '800015',
  '800016', '800020', '800023', '800024', '800025',
  '801503', '801505', '801507',
];

export function isLocalPincode(pincode: string): boolean {
  return PATNA_LOCAL_PINCODES.includes(pincode.trim());
}

export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode.trim());
}

// --- 3. SHIPPING METHODS & SLAB RATES ---

export type CourierType = 'local' | 'standard' | 'express_air' | 'pickup';

export type ShippingMethod = {
  type: CourierType;
  label: string;
  description: string;
  estimatedDays: string;
  available: boolean;
  cost: number;
  freeDelivery: boolean;
  icon: string;
};

export const FREE_LOCAL_DELIVERY_THRESHOLD = 499;

// Local Same-Day Express Delivery — weight slabs
function localShippingCost(weightGrams: number, orderSubtotal: number): number {
  if (orderSubtotal >= FREE_LOCAL_DELIVERY_THRESHOLD) return 0;
  if (weightGrams <= 500) return 30;
  if (weightGrams <= 1000) return 45;
  if (weightGrams <= 2000) return 60;
  return 80;
}

// Standard National Courier (Surface) — weight slabs
function standardShippingCost(weightGrams: number): number {
  if (weightGrams <= 500) return 50;
  if (weightGrams <= 1000) return 75;
  if (weightGrams <= 1500) return 100;
  if (weightGrams <= 2000) return 125;
  const excess = weightGrams - 2000;
  const additionalSlabs = Math.ceil(excess / 500);
  return 125 + additionalSlabs * 25;
}

// Express Air Courier — weight slabs
function expressAirShippingCost(weightGrams: number): number {
  if (weightGrams <= 500) return 80;
  if (weightGrams <= 1000) return 120;
  if (weightGrams <= 1500) return 160;
  if (weightGrams <= 2000) return 200;
  const excess = weightGrams - 2000;
  const additionalSlabs = Math.ceil(excess / 500);
  return 200 + additionalSlabs * 40;
}

// Compute all 4 shipping methods — always returns all options,
// with `available` indicating whether the option is usable for the entered pincode
export function getShippingMethods(
  pincode: string,
  weightGrams: number,
  orderSubtotal: number
): ShippingMethod[] {
  const valid = isValidPincode(pincode);
  const local = isLocalPincode(pincode);
  const methods: ShippingMethod[] = [];

  // 1) Store / Self Pickup — always available
  methods.push({
    type: 'pickup',
    label: 'Store / Self Pickup',
    description: 'Collect directly from store when ready',
    estimatedDays: 'Ready in 24 hours',
    available: true,
    cost: 0,
    freeDelivery: true,
    icon: 'Store',
  });

  // 2) Local Same-Day Delivery — only for Patna local pincodes
  const localCost = localShippingCost(weightGrams, orderSubtotal);
  methods.push({
    type: 'local',
    label: 'Local Same-Day Delivery',
    description: 'Delivery via in-house team — within 2-6 hours',
    estimatedDays: '2-6 hours',
    available: valid && local,
    cost: localCost,
    freeDelivery: localCost === 0,
    icon: 'Bike',
  });

  // 3) Express Delivery (Air) — only for outstation pincodes
  methods.push({
    type: 'express_air',
    label: 'Express Delivery',
    description: 'Air shipping for urgent delivery — 1 to 2 working days',
    estimatedDays: '1-2 days',
    available: valid && !local,
    cost: expressAirShippingCost(weightGrams),
    freeDelivery: false,
    icon: 'Plane',
  });

  // 4) National Delivery (Surface) — only for outstation pincodes
  methods.push({
    type: 'standard',
    label: 'National Delivery',
    description: 'Surface courier — 3 to 5 working days',
    estimatedDays: '3-5 days',
    available: valid && !local,
    cost: standardShippingCost(weightGrams),
    freeDelivery: false,
    icon: 'Truck',
  });

  return methods;
}

// Get a single method's cost by type
export function getShippingCost(
  type: CourierType,
  pincode: string,
  weightGrams: number,
  orderSubtotal: number
): number {
  const method = getShippingMethods(pincode, weightGrams, orderSubtotal).find(
    (m) => m.type === type
  );
  return method?.cost ?? 0;
}

// Format weight in human-readable form
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = (grams / 1000).toFixed(2);
    return `${kg} kg`;
  }
  return `${Math.round(grams)}g`;
}
