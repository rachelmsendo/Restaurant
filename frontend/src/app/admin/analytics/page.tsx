'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { Skeleton, Spinner } from '@/components/ui';

type Period = '1d'|'7d'|'30d'|'60d'|'90d'|'1y'|'custom';

const PERIODS = [
  { id:'1d', label:'Today' }, { id:'7d', label:'7 days' }, { id:'30d', label:'30 days' },
  { id:'60d', label:'60 days' }, { id:'90d', label:'90 days' }, { id:'1y', label:'1 year' }, { id:'custom', label:'Custom' },
];

const STATUS_COLORS: Record<string,string> = {
  pending:'#f59e0b',confirmed:'#3b82f6',preparing:'#f97316',
  ready:'#22c55e',delivered:'#6b7280',cancelled:'#ef4444',
};
const PAY_COLORS: Record<string,string> = { mpesa:'#00a651',stripe:'#635bff',cash:'#78716c' };

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf'|'csv'|null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { period };
      if (period === 'custom' && startDate && endDate) { params.startDate = startDate; params.endDate = endDate; }
      const res = await api.get('/analytics/overview', { params });
      setData(res.data.data);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  }, [period, startDate, endDate]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const exportFile = async (type: 'pdf'|'csv') => {
    setExporting(type);
    try {
      const params: any = { period };
      if (period === 'custom' && startDate && endDate) { params.startDate = startDate; params.endDate = endDate; }
      const res = await api.get(`/analytics/export/${type}`, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `sales-report-${period}-${Date.now()}.${type}`;
      a.click(); window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} report downloaded!`);
    } catch { toast.error(`Failed to export ${type.toUpperCase()}`); }
    finally { setExporting(null); }
  };

  const maxRev = data?.revenueByDay?.length ? Math.max(...data.revenueByDay.map((d:any)=>d.revenue),1) : 1;
  const totals = data?.totals || {};
  const growth = (val: any) => {
    if (val === null || val === undefined) return null;
    const n = parseFloat(val);
    return <span className={cn('text-xs font-semibold ml-1', n>=0?'text-green-600':'text-red-500')}>{n>=0?'↑':'↓'}{Math.abs(n)}%</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Analytics & Reports</h1>
          <p className="text-stone-500 text-sm mt-0.5">Revenue insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>exportFile('csv')} disabled={!!exporting} className="btn-secondary text-sm flex items-center gap-2">
            {exporting==='csv'?<Spinner size="sm"/>:'⬇️'} CSV
          </button>
          <button onClick={()=>exportFile('pdf')} disabled={!!exporting} className="btn-primary text-sm flex items-center gap-2">
            {exporting==='pdf'?<Spinner size="sm"/>:'📄'} PDF Report
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {PERIODS.map(p => (
            <button key={p.id} onClick={()=>setPeriod(p.id as Period)}
              className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all',
                period===p.id?'bg-brand-500 text-white':'bg-stone-100 text-stone-600 hover:bg-stone-200')}>
              {p.label}
            </button>
          ))}
        </div>
        {period==='custom' && (
          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-stone-100">
            <div className="flex-1"><label className="text-xs font-medium text-stone-500 mb-1 block">From</label><input type="date" className="input" value={startDate} onChange={e=>setStartDate(e.target.value)}/></div>
            <div className="flex-1"><label className="text-xs font-medium text-stone-500 mb-1 block">To</label><input type="date" className="input" value={endDate} onChange={e=>setEndDate(e.target.value)}/></div>
            <button onClick={fetchAnalytics} className="btn-primary self-end">Apply</button>
          </div>
        )}
        {data?.period && !loading && (
          <p className="text-xs text-stone-400 mt-2">
            Showing: {new Date(data.period.start).toLocaleDateString('en-KE')} — {new Date(data.period.end).toLocaleDateString('en-KE')}
          </p>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl"/>) : [
          { label:'Total Revenue', value:formatCurrency(totals.totalRevenue||0), icon:'💰', color:'text-green-600', bg:'bg-green-50', growth:totals.revenueGrowth },
          { label:'Total Orders', value:totals.totalOrders||0, icon:'🧾', color:'text-blue-600', bg:'bg-blue-50', growth:totals.ordersGrowth },
          { label:'Avg Order Value', value:formatCurrency(totals.avgOrderValue||0), icon:'📊', color:'text-purple-600', bg:'bg-purple-50', growth:null },
          { label:'Items Sold', value:totals.totalItems||0, icon:'🍽️', color:'text-brand-600', bg:'bg-brand-50', growth:null },
        ].map(card => (
          <div key={card.label} className="card p-5">
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>{card.icon}</div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}{growth(card.growth)}</p>
            <p className="text-xs text-stone-500 mt-1">{card.label}</p>
            {card.growth !== null && card.growth !== undefined && (
              <p className="text-xs text-stone-400 mt-0.5">vs previous period</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-stone-900 mb-5">Revenue Over Time</h2>
          {loading ? <div className="h-48 flex items-end gap-2">{Array.from({length:7}).map((_,i)=><Skeleton key={i} className="flex-1 rounded-t-lg" style={{height:`${30+Math.random()*60}%`}}/>)}</div>
          : data?.revenueByDay?.length===0 ? <div className="h-48 flex items-center justify-center text-stone-400 text-sm">No revenue data for this period</div>
          : (
            <div>
              <div className="flex items-end gap-1.5 h-48 mb-2">
                {data?.revenueByDay?.map((day:any, idx:number) => {
                  const pct = (day.revenue/maxRev)*100;
                  return (
                    <div key={day._id} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:block bg-stone-900 text-white text-xs rounded-xl px-3 py-2 whitespace-nowrap z-10 shadow-lg">
                        <p className="font-semibold">{formatCurrency(day.revenue)}</p>
                        <p className="text-stone-300">{day.orders} orders</p>
                      </div>
                      <div className="w-full bg-brand-500 hover:bg-brand-600 rounded-t-lg transition-all cursor-default"
                        style={{height:`${Math.max(pct,3)}%`, background:`linear-gradient(to top, #ea6c0d, #f97316)`}}/>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5">
                {data?.revenueByDay?.map((day:any) => (
                  <div key={day._id} className="flex-1 text-center text-[9px] text-stone-400 truncate">
                    {new Date(day._id+'T12:00:00').toLocaleDateString('en',{month:'short',day:'numeric'})}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order Status Doughnut (simplified) */}
        <div className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">Order Breakdown</h2>
          {loading ? <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-8 rounded-xl"/>)}</div>
          : (
            <div className="space-y-2.5">
              {Object.entries(data?.statusBreakdown||{}).map(([status,count]:any) => {
                const total = Object.values(data?.statusBreakdown||{}).reduce((s:any,c:any)=>s+c,0) as number;
                const pct = total > 0 ? Math.round((count/total)*100) : 0;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium capitalize text-stone-700">{status}</span>
                      <span className="text-stone-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{width:`${pct}%`, backgroundColor:STATUS_COLORS[status]||'#94a3b8'}}/>
                    </div>
                  </div>
                );
              })}
              {(!data?.statusBreakdown || Object.keys(data.statusBreakdown).length===0) && (
                <p className="text-stone-400 text-sm text-center py-6">No order data</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Selling Items */}
        <div className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">🏆 Top Selling Items</h2>
          {loading ? <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-12 rounded-xl"/>)}</div>
          : (data?.topItems||[]).length===0 ? <p className="text-stone-400 text-sm text-center py-6">No data yet</p>
          : (
            <div className="space-y-3">
              {(data?.topItems||[]).slice(0,8).map((item:any, i:number) => {
                const maxRev2 = Math.max(...(data?.topItems||[]).map((x:any)=>x.revenue),1);
                const pct = (item.revenue/maxRev2)*100;
                return (
                  <div key={item._id} className="flex items-center gap-3">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      i===0?'bg-amber-400 text-white':i===1?'bg-stone-300 text-stone-700':i===2?'bg-orange-300 text-white':'bg-stone-100 text-stone-500')}>
                      {i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-stone-900">{item._id}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{width:`${pct}%`}}/>
                        </div>
                        <span className="text-xs text-stone-400 flex-shrink-0">{item.count}×</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-green-600 flex-shrink-0">{formatCurrency(item.revenue)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="card p-6">
          <h2 className="font-semibold text-stone-900 mb-4">💳 Payment Methods</h2>
          {loading ? <div className="space-y-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-16 rounded-xl"/>)}</div>
          : (data?.paymentMethods||[]).length===0 ? <p className="text-stone-400 text-sm text-center py-6">No payment data</p>
          : (
            <div className="space-y-3">
              {(data?.paymentMethods||[]).map((pm:any) => (
                <div key={pm._id} className="flex items-center gap-4 p-3 bg-stone-50 rounded-xl">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:PAY_COLORS[pm._id]||'#94a3b8'}}/>
                  <div className="flex-1">
                    <p className="text-sm font-semibold capitalize text-stone-900">{pm._id||'Unknown'}</p>
                    <p className="text-xs text-stone-400">{pm.count} transaction{pm.count!==1?'s':''}</p>
                  </div>
                  <span className="font-bold text-stone-900 text-sm">{formatCurrency(pm.revenue)}</span>
                </div>
              ))}
              {/* Cancellation rate */}
              {totals.cancelledOrders > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-600 font-medium">⚠️ Cancellation Rate</p>
                  <p className="text-sm font-bold text-red-700">{totals.cancelledOrders} orders cancelled ({totals.totalOrders>0?Math.round((totals.cancelledOrders/totals.totalOrders)*100):0}%)</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hourly Heatmap */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-stone-900 mb-4">⏰ Busiest Hours</h2>
        {loading ? <Skeleton className="h-28 rounded-xl"/>
        : (
          <div>
            <div className="flex gap-1 overflow-x-auto pb-2">
              {Array.from({length:24}).map((_,hour) => {
                const entries = (data?.hourlyHeatmap||[]).filter((h:any)=>h._id.hour===hour);
                const total = entries.reduce((s:any,e:any)=>s+e.count,0);
                const maxCount = Math.max(...(data?.hourlyHeatmap||[{count:1}]).map((h:any)=>h.count),1);
                const intensity = total/maxCount;
                return (
                  <div key={hour} className="flex flex-col items-center gap-1 flex-shrink-0" title={`${hour}:00 — ${total} orders`}>
                    <div className="w-8 h-16 rounded-lg transition-all" style={{background:intensity>0?`rgba(249,115,22,${Math.max(intensity,0.08)})`:'#f5f5f4'}}/>
                    <span className="text-[9px] text-stone-400">{hour===0?'12a':hour<12?`${hour}a`:hour===12?'12p':`${hour-12}p`}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-stone-400 mt-2">Darker = more orders. Hover bars for details.</p>
          </div>
        )}
      </div>

      {/* Best Performing Tables */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-stone-900 mb-4">🪑 Table Performance</h2>
        {loading ? <Skeleton className="h-24 rounded-xl"/>
        : (data?.tableStats||[]).length===0 ? <p className="text-stone-400 text-sm">No table data</p>
        : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(data?.tableStats||[]).map((t:any,i:number) => (
              <div key={t._id} className={cn('p-3 rounded-xl text-center border-2 transition-all',i===0?'border-brand-400 bg-brand-50':'border-stone-100 bg-stone-50')}>
                <p className="text-lg font-bold text-stone-900">T{t._id}</p>
                <p className="text-xs font-semibold text-brand-500">{formatCurrency(t.revenue)}</p>
                <p className="text-xs text-stone-400">{t.orders} orders</p>
                {i===0&&<span className="text-[10px] bg-brand-500 text-white px-2 py-0.5 rounded-full mt-1 inline-block">Top Table</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Breakdown Table */}
      {!loading && data?.revenueByDay?.length>0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">Daily Breakdown</h2>
            <span className="text-xs text-stone-400">{data.revenueByDay.length} days</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>{['Date','Orders','Revenue','Avg. Order','vs Prior Day'].map(h=>(
                  <th key={h} className="text-left text-xs font-medium text-stone-500 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[...data.revenueByDay].reverse().map((day:any, idx:number, arr:any[]) => {
                  const prev = arr[idx+1];
                  const revDiff = prev ? ((day.revenue-prev.revenue)/Math.max(prev.revenue,1)*100).toFixed(1) : null;
                  return (
                    <tr key={day._id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-stone-700 font-medium">{new Date(day._id+'T12:00:00').toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}</td>
                      <td className="px-5 py-3 text-sm">{day.orders}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-green-600">{formatCurrency(day.revenue)}</td>
                      <td className="px-5 py-3 text-sm text-stone-600">{day.orders>0?formatCurrency(day.revenue/day.orders):'—'}</td>
                      <td className="px-5 py-3 text-sm">
                        {revDiff!==null&&<span className={cn('font-medium',parseFloat(revDiff)>=0?'text-green-600':'text-red-500')}>{parseFloat(revDiff)>=0?'↑':'↓'}{Math.abs(parseFloat(revDiff))}%</span>}
                        {revDiff===null&&<span className="text-stone-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-stone-50 border-t-2 border-stone-200">
                <tr>
                  <td className="px-5 py-3 text-sm font-bold text-stone-900">TOTAL</td>
                  <td className="px-5 py-3 text-sm font-bold">{totals.totalOrders}</td>
                  <td className="px-5 py-3 text-sm font-bold text-green-600">{formatCurrency(totals.totalRevenue)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-stone-600">{totals.totalOrders>0?formatCurrency(totals.totalRevenue/totals.totalOrders):'—'}</td>
                  <td className="px-5 py-3"/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
