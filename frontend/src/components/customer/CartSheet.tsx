'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { RootState } from '@/store';
import { updateQuantity, removeItem, clearCart } from '@/store/slices/cartSlice';
import { setCurrentOrder } from '@/store/slices/orderSlice';
import { formatCurrency } from '@/lib/utils';
import { Modal, QuantityStepper, Spinner } from '@/components/ui';

type Step = 'cart' | 'checkout' | 'payment';

const MOBILE_PROVIDERS = [
  { id: 'mpesa', label: 'M-Pesa', icon: '📱' },
  { id: 'tigopesa', label: 'Tigo Pesa', icon: '🔵' },
  { id: 'airtelmoney', label: 'Airtel Money', icon: '🔴' },
  { id: 'halopesa', label: 'HaloPesa', icon: '🟡' },
  { id: 'mixx', label: 'Mixx by Yas', icon: '🟣' },
  { id: 'stripe', label: 'Card', icon: '💳' },
  { id: 'cash', label: 'Cash', icon: '💵' },
] as const;

export default function CartSheet({
  isOpen,
  onClose,
  tableId,
}: {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
}) {
  const dispatch = useDispatch();
  const cart = useSelector((s: RootState) => s.cart);

  const [step, setStep] = useState<Step>('cart');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof MOBILE_PROVIDERS)[number]['id']>('mpesa');

  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  const subtotal = cart.items.reduce(
    (s: number, i: any) => s + i.price * i.quantity,
    0
  );
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  // ─────────────────────────────────────────────
  // PLACE ORDER (MATCH BACKEND EXACTLY)
  // ─────────────────────────────────────────────
  const placeOrder = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      const orderRes = await api.post('/orders', {
        tableId,
        customerName: customerName.trim(),
        customerPhone: phone.trim(), // ✅ REQUIRED BACKEND FIELD
        notes,
        paymentMethod, // ✅ IMPORTANT FIX
        items: cart.items.map((i: any) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });

      const order = orderRes.data.data.order;
      setPlacedOrder(order);
      dispatch(setCurrentOrder(order));

      // ─────────────────────────────
      // PAYMENT INIT
      // ─────────────────────────────
      if (paymentMethod === 'cash') {
        toast.success('Order placed! Pay at the counter.');
      } else if (paymentMethod === 'stripe') {
        await api.post('/payments/stripe/initiate', {
          orderId: order._id,
        });
      } else {
        // MOBILE MONEY (ALL PROVIDERS)
        await api.post('/payments/mobile-money/initiate', {
          orderId: order._id,
          phoneNumber: phone.trim(),
          provider: paymentMethod,
        });

        toast.success(
          `${paymentMethod.toUpperCase()} STK request sent! Check your phone.`
        );
      }

      dispatch(clearCart());
      setStep('payment');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'payment') setStep('cart');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 'cart'
          ? `Cart (${cart.items.length} items)`
          : step === 'checkout'
          ? 'Checkout'
          : 'Order Placed!'
      }
    >
      {/* ───────────────── CART ───────────────── */}
      {step === 'cart' && (
        <div className="p-5">
          {cart.items.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-5xl block mb-3">🛒</span>
              <p className="text-stone-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {cart.items.map((item: any) => (
                  <CartItemRow key={item.menuItemId} item={item} />
                ))}
              </div>

              <div className="mb-4">
                <label className="text-xs font-medium text-stone-500 mb-1 block">
                  Order notes
                </label>
                <textarea
                  className="input h-20 resize-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="bg-stone-50 rounded-xl p-3 space-y-1.5 mb-5">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (16%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-brand-500">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <button
                className="btn-primary w-full h-12"
                onClick={() => setStep('checkout')}
              >
                Proceed to Checkout →
              </button>
            </>
          )}
        </div>
      )}

      {/* ───────────────── CHECKOUT ───────────────── */}
      {step === 'checkout' && (
        <div className="p-5 space-y-4">
          <input
            className="input"
            placeholder="Your name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <input
            className="input"
            placeholder="Phone number *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* PAYMENT METHODS */}
          <div className="grid grid-cols-3 gap-2">
            {MOBILE_PROVIDERS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPaymentMethod(opt.id)}
                className={`p-3 rounded-xl border text-sm ${
                  paymentMethod === opt.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-stone-200'
                }`}
              >
                <div className="text-xl">{opt.icon}</div>
                {opt.label}
              </button>
            ))}
          </div>

          <button
            className="btn-primary w-full h-12"
            onClick={placeOrder}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : `Place Order · ${formatCurrency(total)}`}
          </button>
        </div>
      )}

      {/* ───────────────── SUCCESS ───────────────── */}
      {step === 'payment' && placedOrder && (
        <div className="p-5 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <span className="text-6xl">🎉</span>
          </motion.div>

          <h3 className="text-xl font-bold">Order Placed!</h3>
          <p>#{placedOrder.orderNumber}</p>

          <button className="btn-primary w-full mt-6" onClick={handleClose}>
            Track My Order
          </button>
        </div>
      )}
    </Modal>
  );
}

// ───────── CART ITEM ─────────
function CartItemRow({ item }: { item: any }) {
  const dispatch = useDispatch();

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center">
        🍽️
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium">{item.name}</p>
        <p className="text-xs text-brand-500">{formatCurrency(item.price)}</p>
      </div>

      <QuantityStepper
        value={item.quantity}
        onChange={(v) =>
          dispatch(
            v === 0
              ? removeItem(item.menuItemId)
              : updateQuantity({
                  menuItemId: item.menuItemId,
                  quantity: v,
                })
          )
        }
        min={0}
      />
    </div>
  );
}