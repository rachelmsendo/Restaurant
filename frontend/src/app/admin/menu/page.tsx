'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import { Modal, Skeleton, EmptyState, Spinner } from '@/components/ui';
import ImageUploader from '@/components/ui/ImageUploader';
import { ImageGallery } from '@/components/ui/ImageGallery';

export default function AdminMenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string|null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [iR, cR] = await Promise.all([api.get('/menu/items',{params:{limit:100}}), api.get('/categories')]);
      setItems(iR.data.data.items); setCategories(cR.data.data.categories);
    } catch { toast.error('Failed to load menu'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter(i => (activeCategory==='all'||i.category?._id===activeCategory) && (!search||i.name.toLowerCase().includes(search.toLowerCase())));
  const openCreate = () => { setEditingItem(null); setFormOpen(true); };
  const openEdit = (item: any, e?: any) => { e?.stopPropagation(); setEditingItem(item); setFormOpen(true); };
  const openDetail = (item: any) => { setViewingItem(item); setDetailOpen(true); };
  const handleSaved = (saved: any) => { setItems(p => editingItem ? p.map(i => i._id===saved._id?saved:i) : [saved,...p]); setFormOpen(false); };

  const toggleAvail = async (item: any, e: any) => {
    e.stopPropagation();
    try { const r = await api.put(`/menu/items/${item._id}`,{isAvailable:!item.isAvailable}); setItems(p=>p.map(i=>i._id===item._id?r.data.data.item:i)); toast.success(`${item.name} updated`); } catch { toast.error('Failed'); }
  };
  const delItem = async (item: any, e: any) => {
    e.stopPropagation(); if(!confirm(`Delete "${item.name}"?`)) return;
    setDeletingId(item._id);
    try { await api.delete(`/menu/items/${item._id}`); setItems(p=>p.filter(i=>i._id!==item._id)); toast.success('Deleted'); } catch { toast.error('Failed'); } finally { setDeletingId(null); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-stone-900">Menu Management</h1><p className="text-stone-500 text-sm mt-0.5">{items.length} items · {categories.length} categories</p></div>
        <button className="btn-primary w-full sm:w-auto" onClick={openCreate}>+ Add Item</button>
      </div>
      <div className="card p-4 mb-6 flex flex-col gap-3">
        <input className="input" placeholder="Search menu items…" value={search} onChange={e=>setSearch(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button onClick={()=>setActiveCategory('all')} className={cn('flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all',activeCategory==='all'?'bg-brand-500 text-white':'bg-stone-100 text-stone-600 hover:bg-stone-200')}>All ({items.length})</button>
          {categories.map((c:any)=>(
            <button key={c._id} onClick={()=>setActiveCategory(c._id)} className={cn('flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',activeCategory===c._id?'bg-brand-500 text-white':'bg-stone-100 text-stone-600 hover:bg-stone-200')}>{c.icon} {c.name}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-64 rounded-2xl"/>)}</div>
      ) : filtered.length===0 ? (
        <EmptyState icon="🍽️" title="No items found" description="Try adjusting filters or add a new item." action={<button className="btn-primary mt-2" onClick={openCreate}>+ Add First Item</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item:any,idx:number)=>(
            <motion.div key={item._id} layout initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{delay:idx*0.02}}
              className={cn('card overflow-hidden cursor-pointer hover:shadow-card-lg transition-all hover:-translate-y-0.5',!item.isAvailable&&'opacity-60')} onClick={()=>openDetail(item)}>
              <div className="relative h-40 bg-stone-100 overflow-hidden">
                {item.images?.length>0 ? <img src={item.images.find((i:any)=>i.isCover)?.url||item.images[0]?.url} alt={item.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-5xl">{item.category?.icon||'🍽️'}</div>}
                {item.images?.length>1&&<div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">📷 {item.images.length}</div>}
                {item.isPopular&&<span className="absolute top-2 left-2 badge bg-brand-500 text-white text-[10px]">🔥 Popular</span>}
                {!item.isAvailable&&<div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="bg-white text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-full">Unavailable</span></div>}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className="font-semibold text-sm text-stone-900 flex-1 mr-2 line-clamp-1">{item.name}</h3>
                  <span className="text-brand-500 font-bold text-sm">{formatCurrency(item.price)}</span>
                </div>
                <p className="text-xs text-stone-400 mb-2">{item.category?.name} · ⏱️{item.preparationTime}min{item.totalOrders>0?` · 📦${item.totalOrders}`:''}</p>
                <div className="flex gap-1 mb-3 flex-wrap">
                  {item.isVegetarian&&<span className="badge bg-green-100 text-green-700 text-[10px]">🌱</span>}
                  {item.isVegan&&<span className="badge bg-emerald-100 text-emerald-700 text-[10px]">🌿</span>}
                  {item.isSpicy&&<span className="badge bg-red-100 text-red-600 text-[10px]">🌶️</span>}
                  {item.isGlutenFree&&<span className="badge bg-blue-100 text-blue-700 text-[10px]">GF</span>}
                </div>
                <div className="flex gap-2" onClick={e=>e.stopPropagation()}>
                  <button onClick={e=>openEdit(item,e)} className="btn-secondary flex-1 py-1.5 text-xs">✏️ Edit</button>
                  <button onClick={e=>toggleAvail(item,e)} className={cn('flex-1 py-1.5 text-xs rounded-xl font-medium border transition-all',item.isAvailable?'border-stone-200 text-stone-600 hover:bg-stone-50':'border-green-300 text-green-600 hover:bg-green-50')}>{item.isAvailable?'Hide':'✓ Show'}</button>
                  <button onClick={e=>delItem(item,e)} disabled={deletingId===item._id} className="w-9 flex items-center justify-center rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-all">{deletingId===item._id?<Spinner size="sm"/>:'🗑️'}</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={detailOpen} onClose={()=>setDetailOpen(false)} title={viewingItem?.name}>
        {viewingItem&&<AdminItemDetail item={viewingItem} onEdit={()=>{setDetailOpen(false);openEdit(viewingItem);}}/>}
      </Modal>
      <Modal isOpen={formOpen} onClose={()=>setFormOpen(false)} title={editingItem?'Edit Item':'Add New Item'}>
        <MenuItemForm categories={categories} item={editingItem} onSaved={handleSaved} onCancel={()=>setFormOpen(false)}/>
      </Modal>
    </div>
  );
}

function AdminItemDetail({item,onEdit}:{item:any;onEdit:()=>void}) {
  return (
    <div className="overflow-y-auto max-h-[80vh]">
      <ImageGallery images={item.images||[]} name={item.name}/>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div><h2 className="text-xl font-bold">{item.name}</h2><p className="text-stone-500 text-sm">{item.category?.name}</p></div>
          <span className="text-2xl font-bold text-brand-500">{formatCurrency(item.price)}</span>
        </div>
        <p className="text-stone-600 text-sm leading-relaxed">{item.description}</p>
        <div className="grid grid-cols-3 gap-3">
          {[{l:'Prep Time',v:`${item.preparationTime}min`,i:'⏱️'},{l:'Total Orders',v:item.totalOrders||0,i:'📦'},{l:'Photos',v:item.images?.length||0,i:'📷'}].map(s=>(
            <div key={s.l} className="bg-stone-50 rounded-xl p-3 text-center"><p className="text-lg">{s.i}</p><p className="font-bold text-sm">{s.v}</p><p className="text-xs text-stone-400">{s.l}</p></div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {item.isAvailable&&<span className="badge bg-green-100 text-green-700">✅ Available</span>}
          {item.isPopular&&<span className="badge bg-brand-100 text-brand-700">🔥 Popular</span>}
          {item.isVegetarian&&<span className="badge bg-green-100 text-green-700">🌱 Veg</span>}
          {item.isVegan&&<span className="badge bg-emerald-100 text-emerald-700">🌿 Vegan</span>}
          {item.isSpicy&&<span className="badge bg-red-100 text-red-600">🌶️ Spicy</span>}
          {item.isGlutenFree&&<span className="badge bg-blue-100 text-blue-700">GF</span>}
        </div>
        {item.allergens?.length>0&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3"><p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Allergens</p><p className="text-sm text-amber-600">{item.allergens.join(', ')}</p></div>}
        {item.ingredients?.length>0&&<div><p className="text-xs font-semibold text-stone-500 mb-1">Ingredients</p><p className="text-sm text-stone-600">{item.ingredients.join(', ')}</p></div>}
        <button className="btn-primary w-full" onClick={onEdit}>✏️ Edit This Item</button>
      </div>
    </div>
  );
}

function MenuItemForm({categories,item,onSaved,onCancel}:any) {
  const [form,setForm] = useState({name:item?.name||'',description:item?.description||'',price:item?.price||'',category:item?.category?._id||item?.category||'',isAvailable:item?.isAvailable??true,isVegetarian:item?.isVegetarian||false,isVegan:item?.isVegan||false,isSpicy:item?.isSpicy||false,isGlutenFree:item?.isGlutenFree||false,isPopular:item?.isPopular||false,preparationTime:item?.preparationTime||15,allergens:(item?.allergens||[]).join(', '),ingredients:(item?.ingredients||[]).join(', ')});
  const [imageSlots,setImageSlots] = useState<any[]>((item?.images||[]).map((i:any)=>({url:i.url,publicId:i.publicId,isCover:i.isCover,isNew:false})));
  const [newFiles,setNewFiles] = useState<File[]>([]);
  const [toRemove,setToRemove] = useState<string[]>([]);
  const [saving,setSaving] = useState(false);
  const set = (k:string,v:any)=>setForm(p=>({...p,[k]:v}));

  const handleImgChange = (slots:any[],files:File[]) => { setImageSlots(slots); setNewFiles(p=>[...p,...files]); };
  const handleRemove = (pid:string) => setToRemove(p=>[...p,pid]);

  const handleSubmit = async () => {
    if(!form.name||!form.price||!form.category){toast.error('Name, price and category required');return;}
    setSaving(true);
    try {
      const fd=new FormData();
      Object.entries(form).forEach(([k,v])=>fd.append(k,String(v)));
      fd.set('allergens',JSON.stringify(form.allergens.split(',').map((s:string)=>s.trim()).filter(Boolean)));
      fd.set('ingredients',JSON.stringify(form.ingredients.split(',').map((s:string)=>s.trim()).filter(Boolean)));
      for(const f of newFiles) fd.append('images',f);
      if(toRemove.length>0) fd.append('removeImages',JSON.stringify(toRemove));
      const coverSlot=imageSlots.find(s=>s.isCover&&!s.isNew);
      if(coverSlot) fd.append('coverImagePublicId',coverSlot.publicId);
      const res=item ? await api.put(`/menu/items/${item._id}`,fd,{headers:{'Content-Type':'multipart/form-data'}}) : await api.post('/menu/items',fd,{headers:{'Content-Type':'multipart/form-data'}});
      toast.success(item?'Item updated!':'Item created!');
      onSaved(res.data.data.item);
    } catch(err:any){toast.error(err.response?.data?.message||'Save failed');} finally{setSaving(false);}
  };

  return (
    <div className="overflow-y-auto max-h-[80vh]">
      <div className="p-5 space-y-5">
        <ImageUploader images={imageSlots} onChange={handleImgChange} onRemove={handleRemove} maxImages={5}/>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><label className="text-xs font-medium text-stone-500 mb-1 block">Item Name *</label><input className="input" placeholder="e.g. Grilled Chicken Burger" value={form.name} onChange={e=>set('name',e.target.value)}/></div>
          <div><label className="text-xs font-medium text-stone-500 mb-1 block">Price (TSH) *</label><input className="input" type="number" min="0" step="50" value={form.price} onChange={e=>set('price',e.target.value)}/></div>
          <div><label className="text-xs font-medium text-stone-500 mb-1 block">Category *</label><select className="input" value={form.category} onChange={e=>set('category',e.target.value)}><option value="">Select…</option>{categories.map((c:any)=><option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="text-xs font-medium text-stone-500 mb-1 block">Description</label><textarea className="input h-20 resize-none" value={form.description} onChange={e=>set('description',e.target.value)}/></div>
          <div><label className="text-xs font-medium text-stone-500 mb-1 block">Prep Time (min)</label><input className="input" type="number" min="1" value={form.preparationTime} onChange={e=>set('preparationTime',Number(e.target.value))}/></div>
          <div><label className="text-xs font-medium text-stone-500 mb-1 block">Allergens</label><input className="input" placeholder="gluten, nuts, dairy" value={form.allergens} onChange={e=>set('allergens',e.target.value)}/></div>
          <div className="sm:col-span-2"><label className="text-xs font-medium text-stone-500 mb-1 block">Ingredients</label><input className="input" placeholder="beef, lettuce, tomato…" value={form.ingredients} onChange={e=>set('ingredients',e.target.value)}/></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {([['isAvailable','✅ Available'],['isPopular','🔥 Popular'],['isVegetarian','🌱 Vegetarian'],['isVegan','🌿 Vegan'],['isSpicy','🌶️ Spicy'],['isGlutenFree','🌾 Gluten Free']] as const).map(([k,label])=>(
            <button key={k} type="button" onClick={()=>set(k,!(form as any)[k])} className={cn('px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all',(form as any)[k]?'border-brand-500 bg-brand-50 text-brand-700':'border-stone-200 text-stone-500 hover:border-stone-300')}>{label}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 p-5 pt-0 border-t border-stone-100">
        <button className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>
        <button className="btn-primary flex-1" onClick={handleSubmit} disabled={saving}>{saving?<Spinner size="sm"/>:item?'Save Changes':'Create Item'}</button>
      </div>
    </div>
  );
}
