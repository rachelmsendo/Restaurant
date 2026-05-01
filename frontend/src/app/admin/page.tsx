'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import api from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { formatCurrency, timeAgo } from '@/lib/utils';
import { StatusBadge, Skeleton } from '@/components/ui';
import type { RootState } from '@/store';

interface DashStats {
  todayRevenue: number;
  todayOrders: number;
  activeOrders: number;
  readyOrders: number;
}

export default function AdminDashboard() {
  const { user } = useSelector((s: RootState) => s.auth);
  const [stats, setStats] = useState<DashStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        api.get('/analytics/today'),
        api.get('/orders', { params: { limit: 8 } }),
      ]);
      const { today, statusBreakdown } = analyticsRes.data.data;
      const bm = Object.fromEntries(statusBreakdown.map((s: any) => [s._id, s.count]));
      setStats({
        todayRevenue: today.revenue || 0,
        todayOrders: today.count || 0,
        activeOrders: (bm.pending || 0) + (bm.confirmed || 0) + (bm.preparing || 0),
        readyOrders: bm.ready || 0,
      });
      setRecentOrders(ordersRes.data.data.orders);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const socket = connectSocket();
    socket.emit('join_admin');
    socket.on('new_order', ({ order }: any) => {
      setRecentOrders(prev => [order, ...prev.slice(0, 7)]);
      setStats(prev => prev ? { ...prev, todayOrders: prev.todayOrders + 1, activeOrders: prev.activeOrders + 1 } : prev);
      toast(`🆕 New order — Table ${order.tableNumber}`, { duration: 4000 });
    });
    socket.on('order_status_updated', ({ orderId, status }: any) => {
      setRecentOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
    });
    socket.on('payment_success', ({ amount }: any) => {
      setStats(prev => prev ? { ...prev, todayRevenue: prev.todayRevenue + amount } : prev);
    });
    return () => { socket.off('new_order'); socket.off('order_status_updated'); socket.off('payment_success'); };
  }, [fetchData]);

  const statCards = [
    { label: "Today's Revenue", value: formatCurrency(stats?.todayRevenue || 0), icon: '💰', color: 'text-green-600', bg: 'bg-green-50', extra: '+12% vs yesterday' },
    { label: "Today's Orders", value: String(stats?.todayOrders ?? '—'), icon: '🧾', color: 'text-blue-600', bg: 'bg-blue-50', extra: 'Total placed' },
    { label: 'Active Orders', value: String(stats?.activeOrders ?? '—'), icon: '🔥', color: 'text-orange-600', bg: 'bg-orange-50', pulse: (stats?.activeOrders || 0) > 0 },
    { label: 'Ready to Serve', value: String(stats?.readyOrders ?? '—'), icon: '🎉', color: 'text-brand-600', bg: 'bg-brand-50', pulse: (stats?.readyOrders || 0) > 0 },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Good {greeting}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-stone-500 text-sm mt-1">Here's what's happening at your restaurant today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }} className="card p-5">
            {loading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center text-xl`}>{card.icon}</div>
                  {card.pulse && <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse-dot" />}
                </div>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-stone-500 mt-1">{card.label}</p>
                {card.extra && <p className="text-xs text-stone-400 mt-0.5">{card.extra}</p>}
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { href: '/admin/menu', label: 'Manage Menu', icon: '🍽️', desc: 'Add & edit items' },
          { href: '/admin/tables', label: 'Tables & QR', icon: '🪑', desc: 'Generate QR codes' },
          { href: '/kitchen', label: 'Kitchen Display', icon: '👨‍🍳', desc: 'Open KDS in new tab' },
        ].map(link => (
          <Link key={link.href} href={link.href} target={link.href === '/kitchen' ? '_blank' : undefined}
            className="card p-4 hover:shadow-card-lg transition-all hover:-translate-y-0.5 group">
            <span className="text-2xl block mb-2">{link.icon}</span>
            <p className="text-sm font-semibold text-stone-900 group-hover:text-brand-600 transition-colors">{link.label}</p>
            <p className="text-xs text-stone-400 mt-0.5">{link.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">Live Orders</h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Live
            </span>
            <Link href="/admin/orders" className="text-xs text-brand-500 hover:underline">View all →</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                {['Order #', 'Table', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Time'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-stone-500 uppercase tracking-wide px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  ))}</tr>
                ))
              ) : recentOrders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-stone-400">No orders today yet</td></tr>
              ) : (
                recentOrders.map(order => (
                  <tr key={order._id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-mono text-brand-600">{order.orderNumber}</td>
                    <td className="px-6 py-3.5 text-sm text-stone-700 font-medium">T{order.tableNumber}</td>
                    <td className="px-6 py-3.5 text-sm text-stone-600">{order.customerName || '—'}</td>
                    <td className="px-6 py-3.5 text-sm text-stone-500">{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</td>
                    <td className="px-6 py-3.5 text-sm font-semibold">{formatCurrency(order.total)}</td>
                    <td className="px-6 py-3.5">
                      <span className={`badge ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-3.5"><StatusBadge status={order.status} /></td>
                    <td className="px-6 py-3.5 text-xs text-stone-400">{timeAgo(order.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
