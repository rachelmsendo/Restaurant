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

export default function CartSheet({ isOpen, onClose, tableId }: {
  isOpen: boolean; onClose: () => void; tableId: string;
}) {
  const dispatch = useDispatch();
  const cart = useSelector((s: RootState) => s.cart);
  const [step, setStep] = useState<Step>('cart');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'stripe' | 'cash'>('mpesa');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  const subtotal = cart.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const placeOrder = async () => {
    if (!customerName.trim()) { toast.error('Please enter your name'); return; }
    setLoading(true);
    try {
      const orderRes = await api.post('/orders', {
        tableId,
        customerName: customerName.trim(),
        notes,
        items: cart.items.map((i: any) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });

      const order = orderRes.data.data.order;
      setPlacedOrder(order);
      dispatch(setCurrentOrder(order));

      // Initiate payment
      if (paymentMethod === 'mpesa') {
        await api.post('/payments/mpesa/initiate', {
          orderId: order._id,
          phoneNumber: phone || '0712345678',
        });
        toast.success('M-Pesa STK push sent to your phone!');
      } else if (paymentMethod === 'cash') {
        toast.success('Order placed! Pay at the counter.');
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
    <Modal isOpen={isOpen} onClose={handleClose} title={
      step === 'cart' ? `Cart (${cart.items.length} items)` :
      step === 'checkout' ? 'Checkout' : 'Order Placed!'
    }>
      {/* STEP: Cart */}
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

              {/* Notes */}
              <div className="mb-4">
                <label className="text-xs font-medium text-stone-500 mb-1 block">Order notes (optional)</label>
                <textarea
                  className="input h-20 resize-none"
                  placeholder="Any special requests…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Totals */}
              <div className="bg-stone-50 rounded-xl p-3 space-y-1.5 mb-5">
                <div className="flex justify-between text-sm text-stone-600">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-stone-600">
                  <span>Tax (16%)</span><span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                  <span>Total</span><span className="text-brand-500">{formatCurrency(total)}</span>
                </div>
              </div>

              <button className="btn-primary w-full h-12 text-base" onClick={() => setStep('checkout')}>
                Proceed to Checkout →
              </button>
            </>
          )}
        </div>
      )}

      {/* STEP: Checkout */}
      {step === 'checkout' && (
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Your name *</label>
            <input className="input" placeholder="e.g. John Doe" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>

          {/* Payment method */}
          <div>
            <label className="text-xs font-medium text-stone-500 mb-2 block">Payment method</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'mpesa', label: 'M-Pesa', icon: '📱' },
                { id: 'stripe', label: 'Card', icon: '💳' },
                { id: 'cash', label: 'Cash', icon: '💵' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    paymentMethod === opt.id
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'mpesa' && (
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1 block">M-Pesa phone number</label>
              <input className="input" placeholder="07XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
              <p className="text-xs text-stone-400 mt-1">You'll receive an STK push to confirm payment</p>
            </div>
          )}

          {/* Order summary */}
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs font-medium text-stone-500 mb-2">Order summary</p>
            {cart.items.map((i: any) => (
              <div key={i.menuItemId} className="flex justify-between text-sm text-stone-700 py-0.5">
                <span>{i.name} × {i.quantity}</span>
                <span>{formatCurrency(i.price * i.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-stone-900 pt-2 border-t border-stone-200 mt-2">
              <span>Total</span><span className="text-brand-500">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setStep('cart')}>← Back</button>
            <button className="btn-primary flex-1 h-12" onClick={placeOrder} disabled={loading}>
              {loading ? <Spinner size="sm" /> : `Place Order · ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      )}

      {/* STEP: Payment confirmation */}
      {step === 'payment' && placedOrder && (
        <div className="p-5 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
            <span className="text-6xl block mb-4">🎉</span>
          </motion.div>
          <h3 className="text-xl font-bold text-stone-900 mb-1">Order Placed!</h3>
          <p className="text-stone-500 mb-1">Order #{placedOrder.orderNumber}</p>
          <p className="text-sm text-stone-400 mb-6">
            {paymentMethod === 'mpesa' ? 'Complete payment on your phone' :
             paymentMethod === 'cash' ? 'Please pay at the counter' : 'Payment processing…'}
          </p>
          <div className="bg-stone-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-medium text-stone-500 mb-2">What happens next?</p>
            <div className="space-y-2">
              {[
                { icon: '✅', text: 'Kitchen receives your order' },
                { icon: '👨‍🍳', text: 'Chef starts preparing' },
                { icon: '🔔', text: 'You\'ll be notified when ready' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-stone-600">
                  <span>{step.icon}</span><span>{step.text}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full h-12" onClick={handleClose}>Track My Order</button>
        </div>
      )}
    </Modal>
  );
}

function CartItemRow({ item }: { item: any }) {
  const dispatch = useDispatch();
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0">
        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-xl">🍽️</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900 truncate">{item.name}</p>
        <p className="text-xs text-brand-500 font-semibold">{formatCurrency(item.price)}</p>
      </div>
      <QuantityStepper
        value={item.quantity}
        onChange={v => dispatch(v === 0 ? removeItem(item.menuItemId) : updateQuantity({ menuItemId: item.menuItemId, quantity: v }))}
        min={0}
      />
    </div>
  );
}
