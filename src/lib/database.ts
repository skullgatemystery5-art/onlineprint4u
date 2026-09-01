import { supabase, isSupabaseConfigured } from './supabase';

export { isSupabaseConfigured };

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
  fileUrl?: string;
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
// PROFILES
// ============================================================

export async function getProfile(uid: string): Promise<Profile | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error || !data) return null;
    return data as Profile;
  } catch {
    return null;
  }
}

export async function upsertProfile(profile: Omit<Profile, 'created_at'>): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('profiles').upsert({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      role: profile.role,
    });
  } catch {
    // non-blocking
  }
}

export async function updateProfile(uid: string, updates: Partial<Profile>): Promise<void> {
  if (!supabase) return;
  await supabase.from('profiles').update(updates).eq('id', uid);
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Profile[];
  } catch {
    return [];
  }
}

// ============================================================
// ADDRESSES
// ============================================================

export async function getAddresses(userId: string): Promise<Address[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Address[];
  } catch {
    return [];
  }
}

export async function insertAddress(addr: Omit<Address, 'id' | 'created_at'>): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: addr.user_id,
        label: addr.label,
        name: addr.name,
        phone: addr.phone,
        alternate_phone: addr.alternate_phone,
        email: addr.email,
        line1: addr.line1,
        line2: addr.line2,
        house_flat: addr.house_flat,
        street_area: addr.street_area,
        landmark: addr.landmark,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        delivery_instructions: addr.delivery_instructions,
        is_default: addr.is_default,
      })
      .select('id')
      .maybeSingle();
    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}

export async function updateAddress(id: string, updates: Partial<Address>): Promise<void> {
  if (!supabase) return;
  await supabase.from('addresses').update(updates).eq('id', id);
}

export async function deleteAddress(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('addresses').delete().eq('id', id);
}

// ============================================================
// ORDERS
// ============================================================

export async function insertOrder(
  order: Omit<Order, 'id' | 'created_at' | 'updated_at'>
): Promise<Order | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_number: order.order_number,
        user_id: order.user_id,
        items: order.items,
        subtotal: order.subtotal,
        discount: order.discount,
        coupon_code: order.coupon_code,
        shipping_cost: order.shipping_cost,
        total: order.total,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.order_status,
        shipping_name: order.shipping_name,
        shipping_phone: order.shipping_phone,
        shipping_address: order.shipping_address,
        shipping_pincode: order.shipping_pincode,
        courier_type: order.courier_type,
        delivery_type_label: order.delivery_type_label,
        payment_screenshot_url: order.payment_screenshot_url,
        customer_email: order.customer_email,
        tracking_id: order.tracking_id,
        notes: order.notes,
      })
      .select('*')
      .maybeSingle();
    if (error || !data) return null;
    return data as Order;
  } catch {
    return null;
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data as Order;
  } catch {
    return null;
  }
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Order[];
  } catch {
    return [];
  }
}

export async function getAllOrders(): Promise<Order[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Order[];
  } catch {
    return [];
  }
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<void> {
  if (!supabase) return;
  await supabase.from('orders').update(updates).eq('id', id);
}

// ============================================================
// ORDER STATUS LOG
// ============================================================

export async function insertStatusLog(entry: { order_id: string; status: string; note: string }): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('order_status_log').insert({
      order_id: entry.order_id,
      status: entry.status,
      note: entry.note,
    });
  } catch {
    // non-blocking
  }
}

// ============================================================
// COUPONS
// ============================================================

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .maybeSingle();
    if (error || !data) return null;
    return data as Coupon;
  } catch {
    return null;
  }
}

export async function getAllCoupons(): Promise<Coupon[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Coupon[];
  } catch {
    return [];
  }
}

export async function insertCoupon(coupon: Omit<Coupon, 'id' | 'created_at' | 'used_count'>): Promise<void> {
  if (!supabase) return;
  await supabase.from('coupons').insert({
    ...coupon,
    used_count: 0,
  });
}

export async function updateCoupon(id: string, updates: Partial<Coupon>): Promise<void> {
  if (!supabase) return;
  await supabase.from('coupons').update(updates).eq('id', id);
}

export async function deleteCoupon(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('coupons').delete().eq('id', id);
}

// ============================================================
// PRICING RATES
// ============================================================

export async function getActivePricingRates(): Promise<PricingRate[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('pricing_rates')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true });
    if (error || !data) return [];
    return data as PricingRate[];
  } catch {
    return [];
  }
}

export async function getAllPricingRates(): Promise<PricingRate[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('pricing_rates')
      .select('*')
      .order('category', { ascending: true });
    if (error || !data) return [];
    return data as PricingRate[];
  } catch {
    return [];
  }
}

export async function updatePricingRate(id: string, updates: Partial<PricingRate>): Promise<void> {
  if (!supabase) return;
  await supabase.from('pricing_rates').update(updates).eq('id', id);
}

// ============================================================
// SHIPPING RATES
// ============================================================

export async function getActiveShippingRates(): Promise<ShippingRate[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('*')
      .eq('active', true)
      .order('base_rate', { ascending: true });
    if (error || !data) return [];
    return data as ShippingRate[];
  } catch {
    return [];
  }
}

export async function getAllShippingRates(): Promise<ShippingRate[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('*')
      .order('base_rate', { ascending: true });
    if (error || !data) return [];
    return data as ShippingRate[];
  } catch {
    return [];
  }
}

export async function updateShippingRate(id: string, updates: Partial<ShippingRate>): Promise<void> {
  if (!supabase) return;
  await supabase.from('shipping_rates').update(updates).eq('id', id);
}

// ============================================================
// SITE SETTINGS
// ============================================================

export async function getSiteSettings(): Promise<Record<string, string>> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.from('site_settings').select('*');
    if (error || !data) return {};
    const map: Record<string, string> = {};
    data.forEach((row: { key: string; value: string }) => {
      map[row.key] = row.value ?? '';
    });
    return map;
  } catch {
    return {};
  }
}

export async function upsertSiteSetting(key: string, value: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' });
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
  if (!supabase) return;
  try {
    await supabase.from('contact_messages').insert(msg);
  } catch {
    // non-blocking
  }
}

export async function getActiveReviews(): Promise<Review[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Review[];
  } catch {
    return [];
  }
}
