'use client';

import { createContext, useContext, useReducer, useEffect } from 'react';

export interface CheckoutAddress {
  recipientName: string;
  phone: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country?: string; // ISO-2 — default BR no consumer
}

export interface ShippingOption {
  id: string;
  carrier: string;
  service: string;
  deadlineDays: number;
  priceCents: number;
  label: string;
}

export interface CheckoutCoupon {
  code: string;
  type: string;
  value: number;
  discountCents: number;
  freeShipping: boolean;
}

export interface CheckoutState {
  step: 'endereco' | 'frete' | 'pagamento' | 'confirmacao';
  address: Partial<CheckoutAddress>;
  customerEmail: string;
  customerName: string;
  customerCpf: string;
  shipping: ShippingOption | null;
  paymentMethod: 'pix' | 'credit_card' | 'boleto' | null;
  isGift: boolean;
  giftMessage: string;
  orderId: string | null;
  orderNumber: string | null;
  coupon: CheckoutCoupon | null;
}

type CheckoutAction =
  | { type: 'SET_ADDRESS'; payload: Partial<CheckoutAddress> }
  | { type: 'SET_CUSTOMER_EMAIL'; payload: string }
  | { type: 'SET_CUSTOMER_NAME'; payload: string }
  | { type: 'SET_CUSTOMER_CPF'; payload: string }
  | { type: 'SET_SHIPPING'; payload: ShippingOption }
  | { type: 'SET_PAYMENT_METHOD'; payload: CheckoutState['paymentMethod'] }
  | { type: 'SET_GIFT'; payload: { isGift: boolean; giftMessage: string } }
  | { type: 'SET_STEP'; payload: CheckoutState['step'] }
  | { type: 'SET_ORDER'; payload: { orderId: string; orderNumber: string } }
  | { type: 'SET_COUPON'; payload: CheckoutCoupon | null }
  | { type: 'RESET' };

const initialState: CheckoutState = {
  step: 'endereco',
  address: {},
  customerEmail: '',
  customerName: '',
  customerCpf: '',
  shipping: null,
  paymentMethod: null,
  isGift: false,
  giftMessage: '',
  orderId: null,
  orderNumber: null,
  coupon: null,
};

function reducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'SET_ADDRESS': return { ...state, address: { ...state.address, ...action.payload } };
    case 'SET_CUSTOMER_EMAIL': return { ...state, customerEmail: action.payload };
    case 'SET_CUSTOMER_NAME': return { ...state, customerName: action.payload };
    case 'SET_CUSTOMER_CPF': return { ...state, customerCpf: action.payload };
    case 'SET_SHIPPING': return { ...state, shipping: action.payload };
    case 'SET_PAYMENT_METHOD': return { ...state, paymentMethod: action.payload };
    case 'SET_GIFT': return { ...state, isGift: action.payload.isGift, giftMessage: action.payload.giftMessage };
    case 'SET_STEP': return { ...state, step: action.payload };
    case 'SET_ORDER': return { ...state, orderId: action.payload.orderId, orderNumber: action.payload.orderNumber };
    case 'SET_COUPON': return { ...state, coupon: action.payload };
    case 'RESET': return initialState;
    default: return state;
  }
}

const STORAGE_KEY = 'lojeo_checkout';

interface CheckoutContextValue {
  state: CheckoutState;
  setAddress: (addr: Partial<CheckoutAddress>) => void;
  setCustomerEmail: (email: string) => void;
  setCustomerName: (name: string) => void;
  setCustomerCpf: (cpf: string) => void;
  setShipping: (opt: ShippingOption) => void;
  setPaymentMethod: (m: CheckoutState['paymentMethod']) => void;
  setGift: (isGift: boolean, giftMessage: string) => void;
  setStep: (s: CheckoutState['step']) => void;
  setOrder: (id: string, number: string) => void;
  setCoupon: (c: CheckoutCoupon | null) => void;
  reset: () => void;
}

const CheckoutCtx = createContext<CheckoutContextValue | null>(null);

export function useCheckout() {
  const ctx = useContext(CheckoutCtx);
  if (!ctx) throw new Error('useCheckout must be inside CheckoutProvider');
  return ctx;
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    if (typeof sessionStorage === 'undefined') return initialState;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? { ...initialState, ...JSON.parse(raw) } : initialState;
    } catch {
      return initialState;
    }
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value: CheckoutContextValue = {
    state,
    setAddress: (addr) => dispatch({ type: 'SET_ADDRESS', payload: addr }),
    setCustomerEmail: (email) => dispatch({ type: 'SET_CUSTOMER_EMAIL', payload: email }),
    setCustomerName: (name) => dispatch({ type: 'SET_CUSTOMER_NAME', payload: name }),
    setCustomerCpf: (cpf) => dispatch({ type: 'SET_CUSTOMER_CPF', payload: cpf }),
    setShipping: (opt) => dispatch({ type: 'SET_SHIPPING', payload: opt }),
    setPaymentMethod: (m) => dispatch({ type: 'SET_PAYMENT_METHOD', payload: m }),
    setGift: (isGift, giftMessage) => dispatch({ type: 'SET_GIFT', payload: { isGift, giftMessage } }),
    setStep: (s) => dispatch({ type: 'SET_STEP', payload: s }),
    setOrder: (id, number) => dispatch({ type: 'SET_ORDER', payload: { orderId: id, orderNumber: number } }),
    setCoupon: (c) => dispatch({ type: 'SET_COUPON', payload: c }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return <CheckoutCtx.Provider value={value}>{children}</CheckoutCtx.Provider>;
}
