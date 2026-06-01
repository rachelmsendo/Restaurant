'use client';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { addItem } from '@/store/slices/cartSlice';
import { formatCurrency } from '@/lib/utils';
import { Modal, QuantityStepper } from '@/components/ui';
import { ImageGallery } from '@/components/ui/ImageGallery';

export default function ItemModal({ item, onClose }: { item: any; onClose: () => void }) {
  const dispatch = useDispatch();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  if (!item) return null;

  const handleAdd = () => {
    dispatch(addItem({
      menuItemId: item._id, name: item.name, price: item.price, quantity,
      image: item.images?.find((i:any)=>i.isCover)?.url || item.images?.[0]?.url,
      notes: notes || undefined,
    }));
    toast.success(`${quantity}× ${item.name} added to cart`, { icon: '🛒', duration: 1800 });
    onClose();
  };

  return (
    <Modal isOpen={!!item} onClose={onClose}>
        <div className="absolute top-3 right-3 z-50">
    <button
      onClick={onClose}
      className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-stone-100 transition"
    >
      ✕
    </button>
  </div>
      {/* Images */}
      <div className="p-4 pb-0">
        {item.images?.length > 0
          ? <ImageGallery images={item.images} name={item.name}/>
          : <div className="w-full aspect-[4/3] rounded-2xl bg-stone-100 flex items-center justify-center text-6xl">{item.category?.icon||'🍽️'}</div>
        }
      </div>

      <div className="p-5 space-y-4">
        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5">
          {item.isPopular&&<span className="badge bg-brand-100 text-brand-700">🔥 Popular</span>}
          {item.isVegetarian&&<span className="badge bg-green-100 text-green-700">🌱 Veg</span>}
          {item.isVegan&&<span className="badge bg-emerald-100 text-emerald-700">🌿 Vegan</span>}
          {item.isSpicy&&<span className="badge bg-red-100 text-red-600">🌶️ Spicy</span>}
          {item.isGlutenFree&&<span className="badge bg-blue-100 text-blue-700">🌾 GF</span>}
          {item.preparationTime&&<span className="badge bg-stone-100 text-stone-600">⏱️ ~{item.preparationTime}min</span>}
        </div>

        <div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">{item.name}</h2>
          <p className="text-stone-500 text-sm leading-relaxed">{item.description}</p>
        </div>

        {/* Ingredients */}
        {item.ingredients?.length>0&&(
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">Ingredients</p>
            <p className="text-sm text-stone-600">{item.ingredients.join(' · ')}</p>
          </div>
        )}

        {/* Allergens */}
        {item.allergens?.length>0&&(
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">⚠️ Contains Allergens</p>
            <p className="text-xs text-amber-600">{item.allergens.join(', ')}</p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-stone-500 mb-1.5 block">Special request (optional)</label>
          <input className="input" placeholder="e.g. No onions, extra sauce, well done" value={notes} onChange={e=>setNotes(e.target.value)}/>
        </div>

        {/* Add to cart */}
        <div className="flex items-center gap-4 pt-2 border-t border-stone-100">
          <QuantityStepper value={quantity} onChange={setQuantity}/>
          <button onClick={handleAdd} disabled={!item.isAvailable}
            className="btn-primary flex-1 h-12 text-base">
            {item.isAvailable ? `Add · ${formatCurrency(item.price*quantity)}` : 'Currently Unavailable'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Order Tracker ────────────────────────────────────────────────────────────
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

const STATUS_STEPS = ['pending','confirmed','preparing','ready','delivered'];
const STATUS_ICON: Record<string,string> = { pending:'⏳',confirmed:'✅',preparing:'👨‍🍳',ready:'🎉',delivered:'✨',cancelled:'❌' };

export function OrderTracker({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const order = useSelector((s: RootState) => s.orders.currentOrder);
  if (!order) return null;
  const currentIdx = STATUS_STEPS.indexOf(order.status);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order #${order.orderNumber}`}>
      <div className="p-5 space-y-5">
        {/* Status hero */}
<div
  className={`rounded-2xl p-5 text-center ${
    order.status === "ready"
      ? "bg-green-50 border-2 border-green-300"
      : order.status === "cancelled"
      ? "bg-red-50 border-2 border-red-200"
      : "bg-stone-50 border-2 border-stone-200"
  }`}
>
  <p className="text-4xl mb-2">
    {STATUS_ICON[order.status] || "📋"}
  </p>

  <p className="font-bold text-stone-900 text-lg">
    {order.status === "ready"
      ? "Your food is ready!"
      : order.status === "preparing"
      ? "Chef is cooking your order…"
      : order.status === "pending"
      ? "Waiting for confirmation…"
      : order.status === "confirmed"
      ? "Order confirmed!"
      : order.status === "delivered"
      ? "Enjoy your meal!"
      : "Order cancelled"}
  </p>

  {/* Cancellation Reason */}
  {order.status === "cancelled" && order.cancelReason && (
    <p className="text-sm text-red-600 font-medium mt-2 bg-red-100 px-3 py-2 rounded-lg">
      Reason: {order.cancelReason}
    </p>
  )}

  {order.estimatedReadyAt && order.status === "preparing" && (
    <p className="text-sm text-brand-600 font-medium mt-1">
      Est. ready at{" "}
      {new Date(order.estimatedReadyAt).toLocaleTimeString("en", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </p>
  )}
</div>

        {/* Progress steps */}
        {order.status!=='cancelled'&&(
          <div className="flex items-center">
            {STATUS_STEPS.slice(0,-1).map((step,idx)=>(
              <div key={step} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${idx<=currentIdx?'bg-brand-500 text-white shadow-md':'bg-stone-200 text-stone-400'}`}>
                  {idx<currentIdx?'✓':idx+1}
                </div>
                {idx<3&&<div className={`flex-1 h-1 ${idx<currentIdx?'bg-brand-500':'bg-stone-200'} transition-all`}/>}
              </div>
            ))}
          </div>
        )}

        {/* Items */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Your order</p>
          <div className="space-y-2">
            {order.items?.map((item:any,i:number)=>(
              <div key={i} className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl">
                {item.image&&<img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>}
                <div className="flex-1"><p className="text-sm font-medium">{item.name}</p>{item.notes&&<p className="text-xs text-amber-600">📝 {item.notes}</p>}</div>
                <div className="text-right"><p className="text-xs text-stone-400">×{item.quantity}</p><p className="text-sm font-semibold">{formatCurrency(item.price*item.quantity)}</p></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-bold text-stone-900 pt-3 border-t border-stone-100 mt-2">
            <span>Total</span><span className="text-brand-500">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
