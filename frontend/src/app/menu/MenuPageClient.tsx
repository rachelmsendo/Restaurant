'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { setTable, addItem } from '@/store/slices/cartSlice';
import { setMenuData, setLoading, setActiveCategory, setSearchQuery } from '@/store/slices/menuSlice';
import { setCurrentOrder, updateOrderStatus } from '@/store/slices/orderSlice';
import type { RootState } from '@/store';
import { formatCurrency } from '@/lib/utils';
import CartSheet from '@/components/customer/CartSheet';
import ItemModal from '@/components/customer/ItemModal';
import OrderTracker from '@/components/customer/OrderTracker';
import { MenuItemSkeleton, EmptyState } from '@/components/ui';

export default function MenuPageClient() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get('table');
  const dispatch = useDispatch();

  const { categories, items, loading, activeCategory, searchQuery } = useSelector((s: RootState) => s.menu);
  const cart = useSelector((s: RootState) => s.cart);
  const currentOrder = useSelector((s: RootState) => s.orders.currentOrder);

  const [tableInfo, setTableInfo] = useState<any>(null);
  const [tableError, setTableError] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [orderTrackerOpen, setOrderTrackerOpen] = useState(false);

  // Validate table + load menu
  useEffect(() => {
    if (!tableId) { setTableError(true); return; }

    const init = async () => {
      try {
        dispatch(setLoading(true));

        const [tableRes, menuRes] = await Promise.all([
          api.get(`/tables/${tableId}`),
          api.get('/menu'),
        ]);

        const table = tableRes.data.data.table;
        setTableInfo(table);
        dispatch(setTable({ tableId, tableNumber: table.number }));

        const menu = menuRes.data.data.menu;
        const allItems = menu.flatMap((cat: any) => cat.items.map((i: any) => ({ ...i, category: cat })));
        dispatch(setMenuData({ categories: menu.map((c: any) => ({ _id: c._id, name: c.name, icon: c.icon, slug: c.slug })), items: allItems }));
        if (menu.length > 0) dispatch(setActiveCategory(menu[0]._id));
      } catch {
        setTableError(true);
      } finally {
        dispatch(setLoading(false));
      }
    };

    init();
  }, [tableId, dispatch]);

  // Socket.io: real-time order updates
  useEffect(() => {
    if (!tableId) return;
    const socket = connectSocket();
    socket.emit('join_table', { tableId });

    socket.on('order_status_updated', (data: any) => {
      dispatch(updateOrderStatus({ orderId: data.orderId, status: data.status }));
      const msgs: Record<string, string> = {
        confirmed: '✅ Your order is confirmed!',
        preparing: '👨‍🍳 Kitchen is preparing your order',
        ready: '🎉 Your order is ready! Please collect it.',
      };
      if (msgs[data.status]) toast(msgs[data.status], { duration: 5000 });
      if (data.status === 'ready') setOrderTrackerOpen(true);
    });

    socket.on('payment_success', () => {
      toast.success('💳 Payment confirmed!');
    });

    return () => {
      socket.off('order_status_updated');
      socket.off('payment_success');
    };
  }, [tableId, dispatch]);

  // Filtered items
const filteredItems = items.filter(item => {
  const matchCategory =
    !activeCategory || item.category?._id === activeCategory;

  const matchSearch =
    !searchQuery ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase());

  return matchCategory && matchSearch;
});

const displayItems = items.filter(item => {
  const matchCategory =
    !activeCategory || item.category?._id === activeCategory;

  const matchSearch =
    !searchQuery ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase());

  return matchCategory && matchSearch;
});

  const cartCount = cart.items.reduce((s: number, i: any) => s + i.quantity, 0);
  const cartTotal = cart.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

  if (tableError) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-xs">
        <span className="text-6xl block mb-4">🔍</span>
        <h2 className="text-xl font-bold mb-2">Invalid Table</h2>
        <p className="text-stone-500 text-sm">This QR code is not valid. Please scan the QR code on your table again.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-100 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-stone-900">🍽️ RestaurantOS</h1>
              {tableInfo && (
                <p className="text-xs text-stone-500">Table {tableInfo.number} · {tableInfo.name}</p>
              )}
            </div>
            {currentOrder && (
              <button
                onClick={() => setOrderTrackerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-full text-xs font-medium border border-brand-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse-dot" />
                Track Order
              </button>
            )}
          </div>
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">🔍</span>
            <input
              className="input pl-9 pr-4 h-10 bg-stone-50 border-stone-100"
              placeholder="Search menu…"
              value={searchQuery}
              onChange={e => dispatch(setSearchQuery(e.target.value))}
            />
          </div>
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-8 w-20 rounded-full flex-shrink-0" />
                ))
              : categories.map((cat: any) => (
                  <button
                    key={cat._id}
                    onClick={() => dispatch(setActiveCategory(cat._id))}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                      activeCategory === cat._id
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                  </button>
                ))
            }
          </div>
        )}
      </header>

      {/* Menu Grid */}
      <main className="px-4 pt-4">
        {searchQuery && (
          <p className="text-sm text-stone-500 mb-3">
            {displayItems.length} result{displayItems.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <MenuItemSkeleton key={i} />)}
            </motion.div>
          ) : displayItems.length === 0 ? (
            <EmptyState icon="🔍" title="Nothing found" description="Try a different search term or browse a category." />
          ) : (
            <motion.div key="items" className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {displayItems.map((item: any, idx: number) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.25 }}
                >
                  <MenuItemCard item={item} onSelect={() => setSelectedItem(item)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-40"
          >
            <button
              onClick={() => setCartOpen(true)}
              className="w-full btn-primary h-14 text-base rounded-2xl shadow-card-lg justify-between"
            >
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">{cartCount}</span>
              <span>View Cart</span>
              <span className="font-semibold">{formatCurrency(cartTotal)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <CartSheet isOpen={cartOpen} onClose={() => setCartOpen(false)} tableId={tableId!} />
      <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <OrderTracker isOpen={orderTrackerOpen} onClose={() => setOrderTrackerOpen(false)} />
    </div>
  );
}

// ─── Menu Item Card ───────────────────────────────────────────────────────────
function MenuItemCard({ item, onSelect }: { item: any; onSelect: () => void }) {
  const dispatch = useDispatch();

  const quickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(addItem({
      menuItemId: item._id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image?.url,
    }));
    toast.success(`Added ${item.name}`, { duration: 1500, icon: '🛒' });
  };

  return (
    <div
      className="card p-3 flex gap-3 cursor-pointer active:scale-[.99] transition-transform"
      onClick={onSelect}
    >
      {/* Image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 relative">
        {item.image?.url ? (
          <img src={item.image.url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            {item.category?.icon || '🍽️'}
          </div>
        )}
        {item.isPopular && (
          <span className="absolute top-1 left-1 bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            HOT
          </span>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs text-stone-500 font-medium">Unavailable</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex gap-1 mb-0.5 flex-wrap">
          {item.isVegetarian && <span className="text-[10px] text-green-600 font-medium">🌱 Veg</span>}
          {item.isSpicy && <span className="text-[10px] text-red-500 font-medium">🌶️ Spicy</span>}
        </div>
        <h3 className="font-semibold text-stone-900 text-sm leading-tight truncate">{item.name}</h3>
        <p className="text-xs text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold text-brand-500 text-sm">{formatCurrency(item.price)}</span>
          {item.isAvailable && (
            <button
              onClick={quickAdd}
              className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center text-lg font-bold hover:bg-brand-600 active:scale-95 transition-all shadow-sm"
            >+</button>
          )}
        </div>
      </div>
    </div>
  );
}


