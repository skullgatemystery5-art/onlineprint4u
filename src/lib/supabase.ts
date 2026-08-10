import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

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
