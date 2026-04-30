'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { Modal, Spinner, EmptyState, Skeleton } from '@/components/ui';

const ROLE_META: Record<string,{label:string;color:string;icon:string}> = {
  admin:   { label:'Admin',   color:'bg-purple-100 text-purple-700', icon:'⚙️' },
  staff:   { label:'Staff',   color:'bg-blue-100 text-blue-700',     icon:'👤' },
  kitchen: { label:'Kitchen', color:'bg-orange-100 text-orange-700', icon:'👨‍🍳' },
};

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);

  const fetch = useCallback(async () => {
    try { const r = await api.get('/staff'); setStaff(r.data.data.users); }
    catch { toast.error('Failed to load staff'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (user: any) => { setEditing(user); setModalOpen(true); };
  const openDetail = (user: any) => { setViewing(user); setDetailOpen(true); };

  const handleSaved = (saved: any) => {
    setStaff(p => editing ? p.map(u => u._id===saved._id?saved:u) : [saved,...p]);
    setModalOpen(false);
  };

  const toggleActive = async (user: any) => {
    try {
      const r = await api.patch(`/staff/${user._id}/toggle-active`);
      setStaff(p => p.map(u => u._id===user._id?r.data.data.user:u));
      toast.success(`${user.name} ${r.data.data.user.isActive?'activated':'deactivated'}`);
    } catch { toast.error('Update failed'); }
  };

  const deleteStaff = async (user: any) => {
    if(!confirm(`Remove ${user.name} from the team?`)) return;
    try { await api.delete(`/staff/${user._id}`); setStaff(p=>p.filter(u=>u._id!==user._id)); toast.success('Staff member removed'); }
    catch(err:any) { toast.error(err.response?.data?.message||'Delete failed'); }
  };

  const roleFilter = ['all','admin','staff','kitchen'];
  const [roleTab, setRoleTab] = useState('all');
  const filtered = roleTab==='all' ? staff : staff.filter(u=>u.role===roleTab);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold">Staff Management</h1><p className="text-stone-500 text-sm mt-0.5">{staff.length} team members</p></div>
        <button className="btn-primary w-full sm:w-auto" onClick={openCreate}>+ Add Staff</button>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {roleFilter.map(r => (
          <button key={r} onClick={()=>setRoleTab(r)}
            className={cn('flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all',
              roleTab===r?'bg-brand-500 text-white':'bg-white border border-stone-200 text-stone-600 hover:border-stone-300')}>
            {r==='all'?`All (${staff.length})`:r}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-48 rounded-2xl"/>)}</div>
      ) : filtered.length===0 ? (
        <EmptyState icon="👥" title="No staff found" description="Add your first team member." action={<button className="btn-primary mt-2" onClick={openCreate}>+ Add Staff</button>}/>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((user:any) => (
            <motion.div key={user._id} layout initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
              className={cn('card p-5 cursor-pointer hover:shadow-card-lg transition-all',!user.isActive&&'opacity-60')}
              onClick={()=>openDetail(user)}>
              <div className="flex items-start gap-4 mb-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-600 overflow-hidden flex-shrink-0">
                    {user.avatar?.url ? <img src={user.avatar.url} alt={user.name} className="w-full h-full object-cover"/> : user.name[0].toUpperCase()}
                  </div>
                  <div className={cn('absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white',user.isActive?'bg-green-400':'bg-stone-300')}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 truncate">{user.name}</p>
                  <p className="text-xs text-stone-400 truncate">{user.email}</p>
                  {user.phone && <p className="text-xs text-stone-400">{user.phone}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className={cn('badge', ROLE_META[user.role]?.color)}>{ROLE_META[user.role]?.icon} {ROLE_META[user.role]?.label}</span>
                <span className={cn('badge',user.isActive?'bg-green-100 text-green-700':'bg-stone-100 text-stone-500')}>{user.isActive?'Active':'Inactive'}</span>
              </div>
              <p className="text-xs text-stone-400 mb-3">Joined {formatDate(user.createdAt)}{user.lastLogin?` · Last login: ${formatDate(user.lastLogin)}`:''}</p>
              <div className="flex gap-2" onClick={e=>e.stopPropagation()}>
                <button onClick={()=>openEdit(user)} className="btn-secondary flex-1 py-1.5 text-xs">✏️ Edit</button>
                <button onClick={()=>toggleActive(user)} className={cn('flex-1 py-1.5 text-xs rounded-xl font-medium border transition-all',user.isActive?'border-stone-200 text-stone-600 hover:bg-stone-50':'border-green-300 text-green-600 hover:bg-green-50')}>{user.isActive?'Deactivate':'Activate'}</button>
                <button onClick={()=>deleteStaff(user)} className="w-9 flex items-center justify-center rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-all">🗑️</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <Modal isOpen={detailOpen} onClose={()=>setDetailOpen(false)} title={viewing?.name}>
        {viewing && (
          <div className="p-5">
            <div className="flex flex-col items-center mb-5">
              <div className="w-24 h-24 rounded-2xl bg-brand-100 flex items-center justify-center text-4xl font-bold text-brand-600 overflow-hidden mb-3">
                {viewing.avatar?.url?<img src={viewing.avatar.url} alt={viewing.name} className="w-full h-full object-cover"/>:viewing.name[0]}
              </div>
              <span className={cn('badge', ROLE_META[viewing.role]?.color)}>{ROLE_META[viewing.role]?.icon} {ROLE_META[viewing.role]?.label}</span>
            </div>
            {[{l:'Email',v:viewing.email},{l:'Phone',v:viewing.phone||'Not set'},{l:'Status',v:viewing.isActive?'Active':'Inactive'},{l:'Joined',v:formatDate(viewing.createdAt)},{l:'Last Login',v:viewing.lastLogin?formatDate(viewing.lastLogin):'Never'}].map(row=>(
              <div key={row.l} className="flex justify-between py-2.5 border-b border-stone-100 text-sm last:border-0">
                <span className="text-stone-500">{row.l}</span>
                <span className="font-medium text-stone-900">{row.v}</span>
              </div>
            ))}
            <div className="flex gap-3 mt-5">
              <button className="btn-secondary flex-1" onClick={()=>{setDetailOpen(false);openEdit(viewing);}}>✏️ Edit</button>
              <button onClick={()=>{toggleActive(viewing);setDetailOpen(false);}} className={cn('flex-1 py-2.5 text-sm rounded-xl font-medium border transition-all',viewing.isActive?'border-stone-200 text-stone-600 hover:bg-stone-50':'border-green-300 text-green-600 hover:bg-green-50')}>{viewing.isActive?'Deactivate':'Activate'}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit modal */}
      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Staff Member':'Add New Staff'}>
        <StaffForm user={editing} onSaved={handleSaved} onCancel={()=>setModalOpen(false)}/>
      </Modal>
    </div>
  );
}

function StaffForm({user,onSaved,onCancel}:any) {
  const [form,setForm] = useState({name:user?.name||'',email:user?.email||'',password:'',role:user?.role||'staff',phone:user?.phone||''});
  const [saving,setSaving] = useState(false);
  const set = (k:string,v:any)=>setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    if(!form.name||!form.email){toast.error('Name and email required');return;}
    if(!user&&!form.password){toast.error('Password required for new staff');return;}
    setSaving(true);
    try {
      let res;
      if(user) { res = await api.put(`/staff/${user._id}`,{name:form.name,email:form.email,role:form.role,phone:form.phone,...(form.password&&{password:form.password})}); }
      else { res = await api.post('/auth/register',form); }
      toast.success(user?'Staff updated!':'Staff created!');
      onSaved(res.data.data.user||{_id:Date.now(),...form});
    } catch(err:any){toast.error(err.response?.data?.message||'Save failed');} finally{setSaving(false);}
  };

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="text-xs font-medium text-stone-500 mb-1 block">Full Name *</label><input className="input" placeholder="Jane Wanjiku" value={form.name} onChange={e=>set('name',e.target.value)}/></div>
        <div className="col-span-2"><label className="text-xs font-medium text-stone-500 mb-1 block">Email *</label><input className="input" type="email" placeholder="jane@restaurant.com" value={form.email} onChange={e=>set('email',e.target.value)}/></div>
        <div><label className="text-xs font-medium text-stone-500 mb-1 block">Phone</label><input className="input" placeholder="0712345678" value={form.phone} onChange={e=>set('phone',e.target.value)}/></div>
        <div><label className="text-xs font-medium text-stone-500 mb-1 block">{user?'New Password (optional)':'Password *'}</label><input className="input" type="password" placeholder="Min 8 chars" value={form.password} onChange={e=>set('password',e.target.value)}/></div>
      </div>
      <div>
        <label className="text-xs font-medium text-stone-500 mb-2 block">Role</label>
        <div className="grid grid-cols-3 gap-2">
          {(['staff','kitchen','admin'] as const).map(r=>(
            <button key={r} type="button" onClick={()=>set('role',r)} className={cn('py-3 rounded-xl text-sm font-medium border-2 transition-all',form.role===r?'border-brand-500 bg-brand-50 text-brand-700':'border-stone-200 text-stone-600 hover:border-stone-300')}>
              <span className="block text-xl mb-1">{ROLE_META[r].icon}</span>{ROLE_META[r].label}
            </button>
          ))}
        </div>
        <div className="mt-2 p-3 bg-stone-50 rounded-xl text-xs text-stone-500">
          <b>Staff:</b> View & manage orders · <b>Kitchen:</b> KDS only · <b>Admin:</b> Full access
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button className="btn-secondary flex-1" onClick={onCancel}>Cancel</button>
        <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving?<Spinner size="sm"/>:user?'Save Changes':'Add Staff'}</button>
      </div>
    </div>
  );
}
