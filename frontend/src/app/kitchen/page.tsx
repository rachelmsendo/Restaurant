'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { formatCurrency, timeAgo, getNextStatus, cn } from '@/lib/utils';
import { Spinner, Modal } from '@/components/ui';

const STATUS_BORDER: Record<string,string> = { pending:'border-t-amber-400',confirmed:'border-t-blue-400',preparing:'border-t-orange-400',ready:'border-t-green-400' };
const NEXT_BTN: Record<string,string> = { pending:'bg-blue-500 hover:bg-blue-400',confirmed:'bg-orange-500 hover:bg-orange-400',preparing:'bg-green-500 hover:bg-green-400',ready:'bg-stone-500 hover:bg-stone-400' };
const NEXT_LABEL: Record<string,string> = { pending:'✅ Confirm',confirmed:'🔥 Start Cooking',preparing:'🎉 Mark Ready',ready:'✓ Delivered' };

export default function KitchenPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string|null>(null);
  const [filter, setFilter] = useState<'active'|'ready'|'all'>('active');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders', { params: { limit: 80 } });
      setOrders(res.data.data.orders);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const socket = connectSocket();
    socket.emit('join_kitchen');

    socket.on('new_order', ({ order }: any) => {
      setOrders(prev => [order, ...prev]);
      toast(`🆕 Table ${order.tableNumber} — New Order!`, {
        duration: 8000,
        style: { background: '#f97316', color: '#fff', fontWeight: '700', fontSize: '15px' },
      });
      try { new Audio('/sounds/ding.mp3').play().catch(()=>{}); } catch {}
    });

    socket.on('order_status_updated', ({ orderId, status }: any) => {
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
      if (selectedOrder?._id === orderId) setSelectedOrder((p: any) => p ? { ...p, status } : null);
    });

    const interval = setInterval(fetchOrders, 30000);
    return () => {
      socket.off('new_order');
      socket.off('order_status_updated');
      clearInterval(interval);
    };
  }, [fetchOrders, selectedOrder]);

  const advanceStatus = async (order: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = getNextStatus(order.status);
    if (!next) return;
    setUpdatingId(order._id);
    try {
      await api.put(`/orders/${order._id}/status`, { status: next });
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: next } : o));
      if (selectedOrder?._id === order._id) setSelectedOrder((p: any) => ({ ...p, status: next }));
      toast.success(`Order #${order.orderNumber} → ${next}`);
    } catch { toast.error('Update failed'); }
    finally { setUpdatingId(null); }
  };

  const displayOrders = filter === 'active'
    ? orders.filter(o => ['pending','confirmed','preparing'].includes(o.status))
    : filter === 'ready'
    ? orders.filter(o => o.status === 'ready')
    : orders;

  // Sort: urgent first, then by createdAt
  const sorted = [...displayOrders].sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const counts = {
    pending: orders.filter(o=>o.status==='pending').length,
    confirmedPreparing: orders.filter(o=>['confirmed','preparing'].includes(o.status)).length,
    ready: orders.filter(o=>o.status==='ready').length,
  };

  return (
    <div className="min-h-screen bg-stone-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-stone-800/95 backdrop-blur-sm border-b border-stone-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👨‍🍳</span>
            <div>
              <h1 className="font-bold text-base">Kitchen Display</h1>
              <p className="text-xs text-stone-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
                Live Orders · RestaurantOS
              </p>
            </div>
          </div>
          {/* Stat pills */}
          <div className="flex gap-2">
            {[
              { label:'New', count:counts.pending, color:'bg-amber-500' },
              { label:'Cooking', count:counts.confirmedPreparing, color:'bg-orange-500' },
              { label:'Ready', count:counts.ready, color:'bg-green-500' },
            ].map(s=>(
              <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-700 rounded-full text-xs">
                <span className={`w-2 h-2 rounded-full ${s.color}`}/>
                <span className="text-stone-300 hidden sm:inline">{s.label}</span>
                <span className="font-bold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-2">
          {([['active',`Active (${counts.pending+counts.confirmedPreparing})`],['ready',`Ready (${counts.ready})`],['all','All']] as const).map(([id,label])=>(
            <button key={id} onClick={()=>setFilter(id)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all',filter===id?'bg-brand-500 text-white':'bg-stone-700 text-stone-300 hover:bg-stone-600')}>
              {label}
            </button>
          ))}
          <button onClick={fetchOrders} className="ml-auto px-3 py-1.5 rounded-full text-xs bg-stone-700 text-stone-300 hover:bg-stone-600 transition-all">↻</button>
        </div>
      </header>

      {/* Grid */}
      <main className="p-4">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" className="text-stone-400"/></div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🍽️</span>
            <p className="text-stone-400 text-lg font-medium">No {filter === 'all' ? '' : filter} orders</p>
            <p className="text-stone-600 text-sm mt-1">New orders will appear here instantly</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            <AnimatePresence>
              {sorted.map(order => (
                <KitchenOrderCard key={order._id} order={order}
                  onAdvance={(e:any)=>advanceStatus(order,e)}
                  onDetail={()=>setSelectedOrder(order)}
                  updating={updatingId===order._id}/>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Detail modal */}
      <Modal isOpen={!!selectedOrder} onClose={()=>setSelectedOrder(null)}
        title={selectedOrder?`Table ${selectedOrder.tableNumber} — ${selectedOrder.orderNumber}`:''}>
        {selectedOrder && (
          <KitchenOrderDetail order={selectedOrder}
            onAdvance={()=>advanceStatus(selectedOrder)}
            updating={updatingId===selectedOrder._id}/>
        )}
      </Modal>
    </div>
  );
}

function KitchenOrderCard({ order, onAdvance, onDetail, updating }: any) {
  const [now, setNow] = useState(Date.now());
  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()),30000); return()=>clearInterval(t); },[]);

  const elapsed = Math.floor((now - new Date(order.createdAt).getTime()) / 60000);
  const urgent = elapsed > 18 && ['pending','confirmed','preparing'].includes(order.status);
  const next = getNextStatus(order.status);

  return (
    <motion.div layout initial={{opacity:0,scale:0.9,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9}} transition={{duration:0.2}}
      className={cn('bg-stone-800 rounded-2xl border-t-4 overflow-hidden cursor-pointer hover:ring-2 hover:ring-stone-600 transition-all',
        STATUS_BORDER[order.status]||'border-t-stone-600',
        urgent?'ring-2 ring-red-500':'')}
      onClick={onDetail}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-white text-lg">T{order.tableNumber}</p>
              {order.priority==='urgent'&&<span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">URGENT</span>}
            </div>
            <p className="text-xs text-stone-400">{order.orderNumber}</p>
          </div>
          <div className="text-right">
            <div className={cn('text-sm font-bold',urgent?'text-red-400':'text-stone-300')}>
              {urgent?'⚠️ ':''}{elapsed}min
            </div>
            <p className="text-xs text-stone-500 capitalize">{order.status}</p>
          </div>
        </div>
        {order.customerName&&<p className="text-xs text-stone-400 mt-1">👤 {order.customerName}</p>}
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-2 min-h-[80px]">
        {order.items?.slice(0,5).map((item:any,i:number)=>(
          <div key={i} className="flex items-start gap-2">
            <span className="bg-brand-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{item.quantity}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{item.name}</p>
              {item.notes&&<p className="text-xs text-amber-400">📝 {item.notes}</p>}
            </div>
          </div>
        ))}
        {order.items?.length>5&&<p className="text-xs text-stone-500">+{order.items.length-5} more items</p>}
        {order.notes&&<div className="mt-1 p-2 bg-stone-700 rounded-lg"><p className="text-xs text-amber-300">📋 {order.notes}</p></div>}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-stone-700 flex justify-between items-center">
        <span className="text-xs text-stone-500">{order.items?.length} item{order.items?.length!==1?'s':''}</span>
        <span className="text-sm font-bold text-stone-300">{formatCurrency(order.total)}</span>
      </div>

      {/* Action button */}
      {next && (
        <div className="px-4 pb-4 pt-2" onClick={e=>e.stopPropagation()}>
          <button onClick={onAdvance} disabled={updating}
            className={cn('w-full h-10 rounded-xl font-semibold text-sm text-white transition-all active:scale-[.98] flex items-center justify-center gap-2',
              NEXT_BTN[order.status]||'bg-stone-500', 'disabled:opacity-50')}>
            {updating ? <Spinner size="sm" className="text-white"/> : NEXT_LABEL[order.status]}
          </button>
        </div>
      )}
    </motion.div>
  );
}

function KitchenOrderDetail({ order, onAdvance, updating }: any) {
  const next = getNextStatus(order.status);
  const elapsed = Math.floor((Date.now()-new Date(order.createdAt).getTime())/60000);

  return (
    <div className="overflow-y-auto max-h-[80vh]">
      <div className="p-5 space-y-4">
        {/* Status */}
        <div className={cn('rounded-2xl p-4 text-center border-2',
          order.status==='ready'?'bg-green-900/30 border-green-500':order.status==='preparing'?'bg-orange-900/30 border-orange-500':'bg-stone-700 border-stone-600')}>
          <p className="font-bold text-white capitalize text-lg">{order.status}</p>
          <p className="text-stone-400 text-sm">{elapsed} minutes ago · Table {order.tableNumber}</p>
          {order.estimatedReadyAt&&order.status==='preparing'&&(
            <p className="text-brand-400 text-sm font-medium mt-1">Est. ready: {new Date(order.estimatedReadyAt).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</p>
          )}
        </div>

        {/* Customer info */}
        {(order.customerName||order.customerPhone)&&(
          <div className="bg-stone-700 rounded-xl p-3">
            {order.customerName&&<p className="text-white font-medium">👤 {order.customerName}</p>}
            {order.customerPhone&&<p className="text-stone-400 text-sm">📞 {order.customerPhone}</p>}
          </div>
        )}

        {/* All items — full detail for kitchen */}
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-2">Order Items ({order.items?.length})</p>
          <div className="space-y-2">
            {order.items?.map((item:any,i:number)=>(
              <div key={i} className="bg-stone-700 rounded-xl p-3 flex items-start gap-3">
                {item.image&&<img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"/>}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold">{item.name}</p>
                    <span className="bg-brand-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">×{item.quantity}</span>
                  </div>
                  {item.notes&&<p className="text-amber-400 text-xs mt-1 bg-amber-900/30 rounded-lg px-2 py-1">📝 {item.notes}</p>}
                  <p className="text-stone-400 text-xs mt-1">{formatCurrency(item.price)} each</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {order.notes&&(
          <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-400 mb-0.5">📋 Order Notes</p>
            <p className="text-amber-200 text-sm">{order.notes}</p>
          </div>
        )}

        {next && (
          <button onClick={onAdvance} disabled={updating}
            className={cn('w-full h-12 rounded-xl font-bold text-white text-base transition-all flex items-center justify-center gap-2',
              NEXT_BTN[order.status]||'bg-stone-500','disabled:opacity-50')}>
            {updating?<Spinner size="sm" className="text-white"/>:NEXT_LABEL[order.status]}
          </button>
        )}
      </div>
    </div>
  );
}

// const NEXT_BTN: Record<string,string> = { pending:'bg-blue-500 hover:bg-blue-400',confirmed:'bg-orange-500 hover:bg-orange-400',preparing:'bg-green-500 hover:bg-green-400',ready:'bg-stone-600 hover:bg-stone-500' };
// const NEXT_LABEL: Record<string,string> = { pending:'✅ Confirm Order',confirmed:'🔥 Start Cooking',preparing:'🎉 Mark as Ready',ready:'✓ Delivered' };
