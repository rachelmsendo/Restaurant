'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Modal, Spinner, EmptyState, Skeleton } from '@/components/ui';

const EMOJI_OPTIONS = ['🍽️','🥗','🍛','🔥','🥤','🍰','🍖','🥩','🐟','🍕','🌮','🥪','☕','🧃','🍺','🍷','🍣','🥘','🥙','🌯'];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', icon: '🍽️', description: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data.categories);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => { setEditing(null); setForm({ name: '', icon: '🍽️', description: '', sortOrder: categories.length + 1 }); setModalOpen(true); };
  const openEdit = (cat: any) => { setEditing(cat); setForm({ name: cat.name, icon: cat.icon, description: cat.description || '', sortOrder: cat.sortOrder }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const res = await api.put(`/categories/${editing._id}`, form);
        setCategories(prev => prev.map(c => c._id === editing._id ? res.data.data.category : c));
        toast.success('Category updated!');
      } else {
        const res = await api.post('/categories', form);
        setCategories(prev => [...prev, res.data.data.category]);
        toast.success('Category created!');
      }
      setModalOpen(false);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteCategory = async (cat: any) => {
    if (!confirm(`Delete category "${cat.name}"? Items in this category won't be deleted, but will become uncategorized.`)) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      setCategories(prev => prev.filter(c => c._id !== cat._id));
      toast.success('Category deleted');
    } catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Categories</h1>
          <p className="text-stone-500 text-sm mt-1">Organize your menu into sections</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Add Category</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState icon="📂" title="No categories yet" description="Add categories to organize your menu."
          action={<button className="btn-primary mt-2" onClick={openCreate}>+ Add First Category</button>} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <div key={cat._id} className="card p-5 flex flex-col items-center text-center gap-2">
              <span className="text-4xl">{cat.icon}</span>
              <div>
                <p className="font-semibold text-stone-900">{cat.name}</p>
                {cat.description && <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{cat.description}</p>}
                <p className="text-xs text-stone-300 mt-1">Order: {cat.sortOrder}</p>
              </div>
              <div className="flex gap-2 w-full mt-1">
                <button onClick={() => openEdit(cat)} className="btn-secondary flex-1 py-1.5 text-xs">Edit</button>
                <button onClick={() => deleteCategory(cat)} className="px-3 py-1.5 text-xs rounded-xl text-red-500 hover:bg-red-50 border border-red-100 transition-all">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Name *</label>
            <input className="input" placeholder="e.g. Starters" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Icon</label>
            <div className="grid grid-cols-10 gap-1.5 p-3 bg-stone-50 rounded-xl">
              {EMOJI_OPTIONS.map(emoji => (
                <button key={emoji} onClick={() => setForm(p => ({ ...p, icon: emoji }))}
                  className={cn('text-xl p-1 rounded-lg transition-all hover:bg-stone-200', form.icon === emoji ? 'bg-brand-100 ring-2 ring-brand-400' : '')}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Description</label>
            <input className="input" placeholder="Brief description…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 mb-1.5 block">Sort Order</label>
            <input className="input" type="number" min="1" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" /> : editing ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
