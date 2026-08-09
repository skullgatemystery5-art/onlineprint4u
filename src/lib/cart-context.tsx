import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { OrderItem, Coupon, PricingRate, ShippingRate } from './supabase';
import { supabase } from './supabase';
import {
  calculateCartTotal,
  calculateItemPrice,
  type CartTotal,
} from './pricing';
import {
  calculateCartWeight,
  getShippingMethods,
  isValidPincode,
  isLocalPincode,
  type CourierType,
  type ShippingMethod,
} from './shipping';

type CartContextType = {
  items: OrderItem[];
  addItem: (item: OrderItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<OrderItem>) => void;
  updateCopies: (id: string, copies: number) => void;
  reorderItems: (newItems: OrderItem[]) => void;
  clearCart: () => void;
  coupon: Coupon | null;
  couponCode: string;
  setCoupon: (coupon: Coupon | null) => void;
  setCouponCode: (code: string) => void;
  couponError: string | null;
  setCouponError: (e: string | null) => void;
  rates: PricingRate[];
  shippingRates: ShippingRate[];
  selectedCourier: CourierType;
  setSelectedCourier: (c: CourierType) => void;
  pincode: string;
  setPincode: (p: string) => void;
  totals: CartTotal;
  totalWeight: number;
  totalWeightGrams: number;
  estimatedDays: number;
  shippingMethods: ShippingMethod[];
  pincodeValid: boolean;
  isLocal: boolean;
};

const CartContext = createContext<CartContextType>(null as unknown as CartContextType);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<CourierType>('local');
  const [pincode, setPincode] = useState('');

  useEffect(() => {
    supabase
      .from('pricing_rates')
      .select('*')
      .eq('active', true)
      .then(({ data }) => {
        if (data) setRates(data as PricingRate[]);
      });
    supabase
      .from('shipping_rates')
      .select('*')
      .eq('active', true)
      .then(({ data }) => {
        if (data) setShippingRates(data as ShippingRate[]);
      });
  }, []);

  const addItem = useCallback((item: OrderItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateItem = useCallback(
    (id: string, updates: Partial<OrderItem>) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const merged = { ...item, ...updates };
          if (rates.length > 0) {
            const { itemTotal } = calculateItemPrice(merged, rates);
            merged.price = Math.round(itemTotal * 100) / 100;
          }
          return merged;
        })
      );
    },
    [rates]
  );

  const updateCopies = useCallback(
    (id: string, copies: number) => {
      updateItem(id, { copies: Math.max(1, copies) });
    },
    [updateItem]
  );

  const reorderItems = useCallback((newItems: OrderItem[]) => {
    setItems(newItems);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
    setCouponCode('');
    setPincode('');
  }, []);

  const totalWeightGrams = calculateCartWeight(items);
  const totalWeight = totalWeightGrams / 1000;

  const pincodeValid = isValidPincode(pincode);
  const isLocal = pincodeValid && isLocalPincode(pincode);

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const shippingMethods = getShippingMethods(pincode, totalWeightGrams, subtotal);
  const selectedMethod = shippingMethods.find((m) => m.type === selectedCourier) ?? shippingMethods[0];

  const totals = calculateCartTotal(
    items,
    coupon,
    { base_rate: selectedMethod?.cost ?? 0 } as ShippingRate,
    totalWeight
  );

  const estimatedDays = 0;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateItem,
        updateCopies,
        reorderItems,
        clearCart,
        coupon,
        couponCode,
        setCoupon,
        setCouponCode,
        couponError,
        setCouponError,
        rates,
        shippingRates,
        selectedCourier,
        setSelectedCourier,
        pincode,
        setPincode,
        totals,
        totalWeight,
        totalWeightGrams,
        estimatedDays,
        shippingMethods,
        pincodeValid,
        isLocal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
