'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { formatCurrency, timeAgo, getNextStatus, cn } from '@/lib/utils';
import { StatusBadge, Spinner, EmptyState, Skeleton, Modal } from '@/components/ui';

const STATUS_FILTERS = ['all','pending','confirmed','preparing','ready','delivered','cancelled'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [updatingId, setUpdatingId] = useState<string|null>(null);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      const res = await api.get('/orders', { params });
      setOrders(res.data.data.orders);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [statusFilter, dateFilter]);

  useEffect(() => { setLoading(true); fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const socket = connectSocket();
    socket.emit('join_admin');
    socket.on('new_order', ({ order }: any) => {
      setOrders(prev => [order, ...prev]);
      toast(`🆕 New order — Table ${order.tableNumber}`, { duration: 5000 });
    });
    socket.on('order_status_updated', ({ orderId, status }: any) => {
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
      if (selectedOrder?._id === orderId) setSelectedOrder((p: any) => p ? { ...p, status } : null);
    });
    return () => { socket.off('new_order'); socket.off('order_status_updated'); };
  }, [selectedOrder]);

  const advanceStatus = async (order: any) => {
    const next = getNextStatus(order.status);
    if (!next) return;
    setUpdatingId(order._id);
    try {
      await api.put(`/orders/${order._id}/status`, { status: next });
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: next } : o));
      if (selectedOrder?._id === order._id) setSelectedOrder((p: any) => ({ ...p, status: next }));
      toast.success(`Order → ${next}`);
    } catch { toast.error('Update failed'); }
    finally { setUpdatingId(null); }
  };

  const cancelOrder = async (order: any, reason: string) => {
    setUpdatingId(order._id);
    try {
      await api.put(`/orders/${order._id}/status`, { status: 'cancelled', cancelReason: reason });
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: 'cancelled' } : o));
      setSelectedOrder(null);
      toast.success('Order cancelled');
    } catch { toast.error('Failed to cancel'); }
    finally { setUpdatingId(null); }
  };

  const displayOrders = orders.filter(o => {
    if (!search) return true;
    return o.orderNumber?.includes(search) || o.customerName?.toLowerCase().includes(search.toLowerCase()) || String(o.tableNumber).includes(search);
  });

  const counts: Record<string, number> = {};
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Orders</h1>
          <p className="text-stone-500 text-sm mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
            Live · {orders.length} orders
          </p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary text-sm w-full sm:w-auto">↻ Refresh</button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5 flex flex-col sm:flex-row gap-3">
        <input className="input flex-1" placeholder="Search order #, customer, table…" value={search} onChange={e => setSearch(e.target.value)}/>
        <input type="date" className="input sm:w-44" value={dateFilter} onChange={e => setDateFilter(e.target.value)} title="Filter by date"/>
        {dateFilter && <button onClick={() => setDateFilter('')} className="btn-secondary text-sm">✕ Clear date</button>}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all',
              statusFilter === s ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300')}>
            {s === 'all' ? 'All Orders' : s}
            {s !== 'all' && counts[s] > 0 && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-bold',
                statusFilter === s ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-500')}>
                {counts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>{['Order','Time','Table','Customer','Items','Total','Payment','Status','Action'].map(h=>(
                <th key={h} className="text-left text-xs font-medium text-stone-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? Array.from({length:6}).map((_,i)=>(
                <tr key={i}>{Array.from({length:9}).map((_,j)=><td key={j} className="px-4 py-4"><Skeleton className="h-4 w-16"/></td>)}</tr>
              )) : displayOrders.length===0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-stone-400">No orders found</td></tr>
              ) : displayOrders.map(order => {
                const next = getNextStatus(order.status);
                const elapsed = Math.floor((Date.now()-new Date(order.createdAt).getTime())/60000);
                const urgent = elapsed>20&&['pending','confirmed','preparing'].includes(order.status);
                return (
                  <tr key={order._id} onClick={() => setSelectedOrder(order)}
                    className={cn('hover:bg-stone-50 cursor-pointer transition-colors', urgent && 'bg-red-50 hover:bg-red-100')}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-brand-600">{order.orderNumber}</span>
                      {urgent && <span className="ml-1 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">LATE</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400 whitespace-nowrap">{timeAgo(order.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium">T{order.tableNumber}</td>
                    <td className="px-4 py-3 text-sm text-stone-600 max-w-[120px] truncate">{order.customerName||'—'}</td>
                    <td className="px-4 py-3 text-sm text-stone-500">{order.items?.length}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', order.paymentStatus==='paid'?'bg-green-100 text-green-700':'bg-stone-100 text-stone-500')}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={order.status}/></td>
                    <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                      {next && (
                        <button onClick={() => advanceStatus(order)} disabled={updatingId===order._id}
                          className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap">
                          {updatingId===order._id ? <Spinner size="sm"/> : `→ ${next}`}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order ${selectedOrder.orderNumber}` : ''}>
        {selectedOrder && (
          <OrderDetailView order={selectedOrder}
            onAdvance={() => advanceStatus(selectedOrder)}
            onCancel={(reason: string) => cancelOrder(selectedOrder, reason)}
            updating={updatingId === selectedOrder._id}/>
        )}
      </Modal>
    </div>
  );
}

function OrderDetailView({ order, onAdvance, onCancel, updating }: any) {
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const next = getNextStatus(order.status);
  const elapsed = Math.floor((Date.now()-new Date(order.createdAt).getTime())/60000);

  return (
    <div className="overflow-y-auto max-h-[80vh]">
      <div className="p-5 space-y-5">
        {/* Status banner */}
        <div className={cn('rounded-2xl p-4 text-center border-2',
          order.status==='ready'?'bg-green-50 border-green-200':order.status==='cancelled'?'bg-red-50 border-red-200':'bg-stone-50 border-stone-200')}>
          <StatusBadge status={order.status}/>
          <p className="text-xs text-stone-400 mt-1">Order placed {elapsed}min ago</p>
          {order.estimatedReadyAt&&order.status==='preparing'&&(
            <p className="text-xs text-brand-600 font-medium mt-0.5">Est. ready: {new Date(order.estimatedReadyAt).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</p>
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {l:'Table', v:`Table ${order.tableNumber}`},
            {l:'Customer', v:order.customerName||'Anonymous'},
            {l:'Phone', v:order.customerPhone||'—'},
            {l:'Payment', v:<span className={cn('badge text-xs',order.paymentStatus==='paid'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700')}>{order.paymentStatus}</span>},
          ].map(({l,v})=>(
            <div key={l} className="bg-stone-50 rounded-xl p-3">
              <p className="text-xs text-stone-400 mb-0.5">{l}</p>
              <p className="text-sm font-semibold text-stone-900">{v as any}</p>
            </div>
          ))}
        </div>

        {/* Items */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Order Items</p>
          <div className="space-y-2">
            {order.items?.map((item:any, i:number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl">
                {item.image&&<img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.notes&&<p className="text-xs text-amber-600">📝 {item.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-stone-400">×{item.quantity}</p>
                  <p className="text-sm font-semibold">{formatCurrency(item.price*item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-stone-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-stone-600"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
          <div className="flex justify-between text-sm text-stone-600"><span>Tax (16%)</span><span>{formatCurrency(order.tax)}</span></div>
          <div className="flex justify-between font-bold text-stone-900 pt-2 border-t border-stone-200">
            <span>Total</span><span className="text-brand-500 text-lg">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.notes&&(
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">📝 Order Notes</p>
            <p className="text-sm text-amber-600">{order.notes}</p>
          </div>
        )}
        {order.cancelReason&&(
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-red-700 mb-0.5">❌ Cancellation Reason</p>
            <p className="text-sm text-red-600">{order.cancelReason}</p>
          </div>
        )}

        {/* Status History */}
        {order.statusHistory?.length>0&&(
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Status History</p>
            <div className="space-y-1.5">
              {order.statusHistory.map((h:any,i:number)=>(
                <div key={i} className="flex items-center gap-2 text-xs text-stone-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0"/>
                  <StatusBadge status={h.status}/>
                  <span>{new Date(h.updatedAt).toLocaleString('en-KE',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {next && next!=='cancelled' && (
            <button onClick={onAdvance} disabled={updating} className="btn-primary w-full h-12">
              {updating?<Spinner size="sm"/>:`Advance to "${next}"`}
            </button>
          )}
          {['pending','confirmed','preparing'].includes(order.status) && !showCancel && (
            <button onClick={()=>setShowCancel(true)} className="w-full py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl border border-red-100 transition-all">
              Cancel Order
            </button>
          )}
          {showCancel && (
            <div className="space-y-2">
              <input className="input" placeholder="Reason for cancellation…" value={cancelReason} onChange={e=>setCancelReason(e.target.value)}/>
              <div className="flex gap-2">
                <button onClick={()=>setShowCancel(false)} className="btn-secondary flex-1 text-sm">Back</button>
                <button onClick={()=>onCancel(cancelReason)} disabled={!cancelReason.trim()||updating}
                  className="flex-1 py-2.5 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-all">
                  {updating?<Spinner size="sm"/>:'Confirm Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
