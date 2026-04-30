'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Modal, Spinner, EmptyState, Skeleton } from '@/components/ui';

const STATUS_COLOR: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  occupied:  'bg-orange-100 text-orange-700',
  reserved:  'bg-blue-100 text-blue-700',
};

export default function AdminTablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [qrTable, setQrTable] = useState<any>(null);
  const [newTable, setNewTable] = useState({ number: '', name: '', capacity: '4' });
  const [showCreate, setShowCreate] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get('/tables');
      setTables(res.data.data.tables);
    } catch { toast.error('Failed to load tables'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const createTable = async () => {
    if (!newTable.number) { toast.error('Table number is required'); return; }
    setCreating(true);
    try {
      const res = await api.post('/tables', {
        number: Number(newTable.number),
        name: newTable.name || `Table ${newTable.number}`,
        capacity: Number(newTable.capacity),
      });
      setTables(prev => [...prev, res.data.data.table].sort((a, b) => a.number - b.number));
      setNewTable({ number: '', name: '', capacity: '4' });
      setShowCreate(false);
      toast.success(`Table ${newTable.number} created with QR code!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create table');
    } finally { setCreating(false); }
  };

  const regenerateQR = async (table: any) => {
    setRegeneratingId(table._id);
    try {
      const res = await api.post(`/tables/${table._id}/regenerate-qr`);
      setTables(prev => prev.map(t => t._id === table._id ? res.data.data.table : t));
      if (qrTable?._id === table._id) setQrTable(res.data.data.table);
      toast.success('QR code regenerated!');
    } catch { toast.error('Failed to regenerate QR'); }
    finally { setRegeneratingId(null); }
  };

  const downloadQR = (table: any) => {
    if (!table.qrCode?.imageData) { toast.error('No QR code available'); return; }
    const link = document.createElement('a');
    link.href = table.qrCode.imageData;
    link.download = `table-${table.number}-qr.png`;
    link.click();
    toast.success(`QR code for Table ${table.number} downloaded!`);
  };

  const deleteTable = async (table: any) => {
    if (!confirm(`Remove Table ${table.number}?`)) return;
    try {
      await api.delete(`/tables/${table._id}`);
      setTables(prev => prev.filter(t => t._id !== table._id));
      toast.success('Table removed');
    } catch { toast.error('Failed to remove table'); }
  };

  const updateStatus = async (table: any, status: string) => {
    try {
      const res = await api.put(`/tables/${table._id}`, { status });
      setTables(prev => prev.map(t => t._id === table._id ? res.data.data.table : t));
    } catch { toast.error('Update failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Tables & QR Codes</h1>
          <p className="text-stone-500 text-sm mt-1">{tables.length} tables · Scan QR to open menu</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Add Table</button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Available', count: tables.filter(t => t.status === 'available').length, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Occupied', count: tables.filter(t => t.status === 'occupied').length, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Reserved', count: tables.filter(t => t.status === 'reserved').length, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-stone-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tables grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : tables.length === 0 ? (
        <EmptyState icon="🪑" title="No tables yet" description="Add tables to generate QR codes for customers."
          action={<button className="btn-primary mt-2" onClick={() => setShowCreate(true)}>+ Add First Table</button>} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table, idx) => (
            <motion.div key={table._id} initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.04 }}
              className="card p-4 flex flex-col items-center text-center gap-3">
              {/* QR Preview */}
              <div className="w-20 h-20 bg-stone-50 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-brand-400 transition-all"
                onClick={() => setQrTable(table)} title="Click to view QR">
                {table.qrCode?.imageData
                  ? <img src={table.qrCode.imageData} alt={`QR Table ${table.number}`} className="w-full h-full object-contain p-1" />
                  : <span className="text-3xl">📷</span>}
              </div>

              <div>
                <p className="font-bold text-stone-900 text-sm">{table.name}</p>
                <p className="text-xs text-stone-400">Capacity: {table.capacity}</p>
              </div>

              {/* Status pill */}
              <select value={table.status}
                onChange={e => updateStatus(table, e.target.value)}
                className={cn('badge text-xs cursor-pointer border-0 outline-none', STATUS_COLOR[table.status])}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
              </select>

              {/* Actions */}
              <div className="flex gap-1.5 w-full">
                <button onClick={() => setQrTable(table)}
                  className="flex-1 py-1.5 text-xs rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 font-medium transition-all">
                  View QR
                </button>
                <button onClick={() => downloadQR(table)}
                  className="flex-1 py-1.5 text-xs rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 font-medium transition-all">
                  Download
                </button>
              </div>
              <button onClick={() => deleteTable(table)}
                className="w-full py-1.5 text-xs rounded-lg text-red-500 hover:bg-red-50 font-medium transition-all">
                Remove
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      <Modal isOpen={!!qrTable} onClose={() => setQrTable(null)} title={qrTable ? `${qrTable.name} — QR Code` : ''}>
        {qrTable && (
          <div className="p-6 text-center">
            <div className="w-56 h-56 mx-auto bg-white rounded-2xl overflow-hidden flex items-center justify-center border-2 border-stone-100 shadow-card mb-4">
              {qrTable.qrCode?.imageData
                ? <img src={qrTable.qrCode.imageData} alt="QR Code" className="w-full h-full object-contain p-3" />
                : <span className="text-stone-400 text-sm">No QR available</span>}
            </div>
            <p className="text-sm font-semibold text-stone-900 mb-0.5">{qrTable.name}</p>
            <p className="text-xs text-stone-400 mb-1">Capacity: {qrTable.capacity} guests</p>
            {qrTable.qrCode?.url && (
              <a href={qrTable.qrCode.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-brand-500 hover:underline break-all block mb-5">
                {qrTable.qrCode.url}
              </a>
            )}
            <div className="flex gap-3">
              <button onClick={() => regenerateQR(qrTable)} disabled={regeneratingId === qrTable._id}
                className="btn-secondary flex-1">
                {regeneratingId === qrTable._id ? <Spinner size="sm" /> : '↻ Regenerate'}
              </button>
              <button onClick={() => downloadQR(qrTable)} className="btn-primary flex-1">
                ⬇️ Download PNG
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-4">Print this QR code and place it on the table. Customers scan it to open the menu instantly.</p>
          </div>
        )}
      </Modal>

      {/* Create Table Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add New Table">
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Table Number *</label>
            <input className="input" type="number" min="1" placeholder="e.g. 11"
              value={newTable.number} onChange={e => setNewTable(p => ({ ...p, number: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Display Name</label>
            <input className="input" placeholder="e.g. Terrace Table 11"
              value={newTable.name} onChange={e => setNewTable(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1 block">Seating Capacity</label>
            <select className="input" value={newTable.capacity} onChange={e => setNewTable(p => ({ ...p, capacity: e.target.value }))}>
              {[2, 4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} guests</option>)}
            </select>
          </div>
          <p className="text-xs text-stone-400 bg-stone-50 rounded-xl p-3">
            💡 A unique QR code will be automatically generated for this table. Print and display it so customers can scan and order.
          </p>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={createTable} disabled={creating}>
              {creating ? <Spinner size="sm" /> : 'Create + Generate QR'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
