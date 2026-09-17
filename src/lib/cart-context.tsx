import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { OrderItem, Coupon, PricingRate, ShippingRate } from './database';
import { getActivePricingRates, getActiveShippingRates } from './database';
import {
  calculateCartTotal,
  calculateItemPriceLocal,
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
  fileObjects: Record<string, File>;
  addItem: (item: OrderItem, file?: File) => void;
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
  const [items, setItems] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('op4u_cart_items');
      return saved ? JSON.parse(saved) as OrderItem[] : [];
    } catch {
      return [];
    }
  });
  const [fileObjects, setFileObjects] = useState<Record<string, File>>({});
  const [coupon, setCoupon] = useState<Coupon | null>(() => {
    try {
      const saved = localStorage.getItem('op4u_cart_coupon');
      return saved ? JSON.parse(saved) as Coupon : null;
    } catch {
      return null;
    }
  });
  const [couponCode, setCouponCode] = useState(() => {
    try {
      return localStorage.getItem('op4u_cart_coupon_code') || '';
    } catch {
      return '';
    }
  });
  const [couponError, setCouponError] = useState<string | null>(null);
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<CourierType>(() => {
    try {
      return (localStorage.getItem('op4u_cart_courier') as CourierType) || 'local';
    } catch {
      return 'local';
    }
  });
  const [pincode, setPincode] = useState(() => {
    try {
      return localStorage.getItem('op4u_cart_pincode') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    getActivePricingRates().then((data) => {
      if (data) setRates(data);
    });
    getActiveShippingRates().then((data) => {
      if (data) setShippingRates(data);
    });
  }, []);

  useEffect(() => {
    try { localStorage.setItem('op4u_cart_items', JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);
  useEffect(() => {
    try { localStorage.setItem('op4u_cart_coupon', JSON.stringify(coupon)); } catch { /* ignore */ }
  }, [coupon]);
  useEffect(() => {
    try { localStorage.setItem('op4u_cart_coupon_code', couponCode); } catch { /* ignore */ }
  }, [couponCode]);
  useEffect(() => {
    try { localStorage.setItem('op4u_cart_courier', selectedCourier); } catch { /* ignore */ }
  }, [selectedCourier]);
  useEffect(() => {
    try { localStorage.setItem('op4u_cart_pincode', pincode); } catch { /* ignore */ }
  }, [pincode]);

  const addItem = useCallback((item: OrderItem, file?: File) => {
    setItems((prev) => [...prev, item]);
    if (file) {
      setFileObjects((prev) => ({ ...prev, [item.id]: file }));
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setFileObjects((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const updateItem = useCallback(
    (id: string, updates: Partial<OrderItem>) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const merged = { ...item, ...updates };
          const { itemTotal } = calculateItemPriceLocal(merged);
          merged.price = Math.round(itemTotal * 100) / 100;
          return merged;
        })
      );
    },
    []
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
    setFileObjects({});
    setCoupon(null);
    setCouponCode('');
    setPincode('');
    try {
      localStorage.removeItem('op4u_cart_items');
      localStorage.removeItem('op4u_cart_coupon');
      localStorage.removeItem('op4u_cart_coupon_code');
      localStorage.removeItem('op4u_cart_pincode');
    } catch { /* ignore */ }
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

  const estimatedDays = selectedMethod?.available ? parseInt(selectedMethod.estimatedDays.replace(/\D/g, '').split(/\D/)[0] || '0', 10) : 0;

  return (
    <CartContext.Provider
      value={{
        items,
        fileObjects,
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
