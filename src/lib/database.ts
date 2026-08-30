import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

export { isFirebaseConfigured };

// ============================================================
// TYPES
// ============================================================

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'user' | 'admin';
  created_at: string;
};

export type Address = {
  id: string;
  user_id: string;
  label: string;
  name: string;
  phone: string;
  alternate_phone: string | null;
  email: string | null;
  line1: string;
  line2: string | null;
  house_flat: string | null;
  street_area: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at: string;
};

export type PaperGsm = '70' | '75' | '85' | '100';

export type OrderItem = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  pages: number;
  copies: number;
  printType: 'bw' | 'color';
  side: 'single' | 'double';
  orientation: 'portrait' | 'landscape';
  paperGsm: PaperGsm;
  binding: 'none' | 'spiral' | 'soft' | 'hard' | 'thesis';
  lamination: 'none' | 'transparent';
  premiumPhoto: boolean;
  notes: string;
  price: number;
};

export type Order = {
  id: string;
  order_number: string;
  user_id: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping_cost: number;
  total: number;
  payment_method: 'advance' | 'full_upi' | 'cod';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  order_status:
    | 'placed'
    | 'processing'
    | 'printed'
    | 'shipped'
    | 'delivered'
    | 'cancelled';
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_pincode: string;
  courier_type: string;
  delivery_type_label: string | null;
  payment_screenshot_url: string | null;
  customer_email: string | null;
  tracking_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  description: string;
  discount_type: 'flat' | 'percent';
  value: number;
  min_order: number;
  max_discount: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
};

export type PricingRate = {
  id: string;
  category: string;
  key: string;
  label: string;
  price: number;
  unit: string;
  active: boolean;
};

export type ShippingRate = {
  id: string;
  courier_type: string;
  label: string;
  base_rate: number;
  per_kg_rate: number;
  estimated_days: number;
  active: boolean;
};

export type Review = {
  id: string;
  name: string;
  role: string;
  rating: number;
  message: string;
  avatar_color: string;
  active: boolean;
  created_at: string;
};

// ============================================================
// HELPERS
// ============================================================

function tsToString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (val && typeof val === 'object' && 'seconds' in val) {
    const t = val as { seconds: number; nanoseconds?: number };
    return new Date(t.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

function normalizeDoc<T>(data: Record<string, unknown> | undefined, id: string): T | null {
  if (!data) return null;
  const obj: Record<string, unknown> = { ...data, id };
  if (data.created_at) obj.created_at = tsToString(data.created_at);
  if (data.updated_at) obj.updated_at = tsToString(data.updated_at);
  if (data.expires_at) obj.expires_at = tsToString(data.expires_at);
  return obj as unknown as T;
}

// ============================================================
// PROFILES
// ============================================================

export async function getProfile(uid: string): Promise<Profile | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    if (!snap.exists()) return null;
    return normalizeDoc<Profile>(snap.data(), snap.id);
  } catch {
    return null;
  }
}

export async function upsertProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<void> {
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'profiles', profile.id),
      {
        ...profile,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // non-blocking
  }
}

export async function updateProfile(uid: string, updates: Partial<Profile>): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'profiles', uid), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'profiles'), orderBy('created_at', 'desc')));
    return snap.docs
      .map((d) => normalizeDoc<Profile>(d.data(), d.id))
      .filter((p): p is Profile => p !== null);
  } catch {
    return [];
  }
}

// ============================================================
// ADDRESSES
// ============================================================

export async function getAddresses(userId: string): Promise<Address[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'addresses'), where('user_id', '==', userId), orderBy('created_at', 'desc'))
    );
    return snap.docs
      .map((d) => normalizeDoc<Address>(d.data(), d.id))
      .filter((a): a is Address => a !== null);
  } catch {
    return [];
  }
}

export async function insertAddress(addr: Omit<Address, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'addresses'), {
      ...addr,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return ref.id;
  } catch {
    return null;
  }
}

export async function updateAddress(id: string, updates: Partial<Address>): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'addresses', id), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function deleteAddress(id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, 'addresses', id));
}

// ============================================================
// ORDERS
// ============================================================

export async function insertOrder(
  order: Omit<Order, 'id' | 'created_at' | 'updated_at'>
): Promise<Order | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'orders'), {
      ...order,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    const snap = await getDoc(ref);
    return normalizeDoc<Order>(snap.data(), snap.id);
  } catch {
    return null;
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'orders', id));
    if (!snap.exists()) return null;
    return normalizeDoc<Order>(snap.data(), snap.id);
  } catch {
    return null;
  }
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'orders'), where('user_id', '==', userId), orderBy('created_at', 'desc'))
    );
    return snap.docs
      .map((d) => normalizeDoc<Order>(d.data(), d.id))
      .filter((o): o is Order => o !== null);
  } catch {
    return [];
  }
}

export async function getAllOrders(): Promise<Order[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc')));
    return snap.docs
      .map((d) => normalizeDoc<Order>(d.data(), d.id))
      .filter((o): o is Order => o !== null);
  } catch {
    return [];
  }
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'orders', id), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

// ============================================================
// ORDER STATUS LOG
// ============================================================

export async function insertStatusLog(entry: { order_id: string; status: string; note: string }): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, 'order_status_log'), {
      ...entry,
      created_at: serverTimestamp(),
    });
  } catch {
    // non-blocking
  }
}

// ============================================================
// COUPONS
// ============================================================

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  if (!db) return null;
  try {
    const snap = await getDocs(
      query(collection(db, 'coupons'), where('code', '==', code.toUpperCase()), where('active', '==', true))
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    return normalizeDoc<Coupon>(d.data(), d.id);
  } catch {
    return null;
  }
}

export async function getAllCoupons(): Promise<Coupon[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'coupons'), orderBy('created_at', 'desc')));
    return snap.docs
      .map((d) => normalizeDoc<Coupon>(d.data(), d.id))
      .filter((c): c is Coupon => c !== null);
  } catch {
    return [];
  }
}

export async function insertCoupon(coupon: Omit<Coupon, 'id' | 'created_at' | 'updated_at' | 'used_count'>): Promise<void> {
  if (!db) return;
  await addDoc(collection(db, 'coupons'), {
    ...coupon,
    used_count: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateCoupon(id: string, updates: Partial<Coupon>): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'coupons', id), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function deleteCoupon(id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, 'coupons', id));
}

// ============================================================
// PRICING RATES
// ============================================================

export async function getActivePricingRates(): Promise<PricingRate[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'pricing_rates'), where('active', '==', true), orderBy('category', 'asc'))
    );
    return snap.docs
      .map((d) => normalizeDoc<PricingRate>(d.data(), d.id))
      .filter((r): r is PricingRate => r !== null);
  } catch {
    return [];
  }
}

export async function getAllPricingRates(): Promise<PricingRate[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'pricing_rates'), orderBy('category', 'asc')));
    return snap.docs
      .map((d) => normalizeDoc<PricingRate>(d.data(), d.id))
      .filter((r): r is PricingRate => r !== null);
  } catch {
    return [];
  }
}

export async function updatePricingRate(id: string, updates: Partial<PricingRate>): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'pricing_rates', id), updates);
}

// ============================================================
// SHIPPING RATES
// ============================================================

export async function getActiveShippingRates(): Promise<ShippingRate[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'shipping_rates'), where('active', '==', true), orderBy('base_rate', 'asc'))
    );
    return snap.docs
      .map((d) => normalizeDoc<ShippingRate>(d.data(), d.id))
      .filter((r): r is ShippingRate => r !== null);
  } catch {
    return [];
  }
}

export async function getAllShippingRates(): Promise<ShippingRate[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'shipping_rates'), orderBy('base_rate', 'asc')));
    return snap.docs
      .map((d) => normalizeDoc<ShippingRate>(d.data(), d.id))
      .filter((r): r is ShippingRate => r !== null);
  } catch {
    return [];
  }
}

export async function updateShippingRate(id: string, updates: Partial<ShippingRate>): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'shipping_rates', id), updates);
}

// ============================================================
// SITE SETTINGS
// ============================================================

export async function getSiteSettings(): Promise<Record<string, string>> {
  if (!db) return {};
  try {
    const snap = await getDocs(collection(db, 'site_settings'));
    const map: Record<string, string> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.key) map[data.key as string] = (data.value as string) ?? '';
    });
    return map;
  } catch {
    return {};
  }
}

export async function upsertSiteSetting(key: string, value: string): Promise<void> {
  if (!db) return;
  const snap = await getDocs(query(collection(db, 'site_settings'), where('key', '==', key)));
  if (!snap.empty) {
    const docId = snap.docs[0].id;
    await updateDoc(doc(db, 'site_settings', docId), { key, value });
  } else {
    await addDoc(collection(db, 'site_settings'), {
      key,
      value,
      description: '',
      created_at: serverTimestamp(),
    });
  }
}

// ============================================================
// REVIEWS
// ============================================================

export async function insertContactMessage(msg: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, 'contact_messages'), {
      ...msg,
      created_at: serverTimestamp(),
    });
  } catch {
    // non-blocking
  }
}

export async function getActiveReviews(): Promise<Review[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'reviews'), where('active', '==', true), orderBy('created_at', 'desc'))
    );
    return snap.docs
      .map((d) => normalizeDoc<Review>(d.data(), d.id))
      .filter((r): r is Review => r !== null);
  } catch {
    return [];
  }
}
