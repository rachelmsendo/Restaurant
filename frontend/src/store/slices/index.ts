// ─── authSlice ────────────────────────────────────────────────────────────────
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';

interface AuthState {
  user: { id: string; name: string; email: string; role: string } | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialAuthState: AuthState = {
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ros_user') || 'null') : null,
  token: typeof window !== 'undefined' ? localStorage.getItem('ros_token') : null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk('auth/login', async (credentials: { email: string; password: string }, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', credentials);
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ros_token');
        localStorage.removeItem('ros_user');
      }
    },
    setCredentials: (state, action: PayloadAction<{ user: any; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('ros_token', action.payload.token);
        localStorage.setItem('ros_user', JSON.stringify(action.payload.user));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        if (typeof window !== 'undefined') {
          localStorage.setItem('ros_token', action.payload.token);
          localStorage.setItem('ros_user', JSON.stringify(action.payload.user));
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, setCredentials } = authSlice.actions;
export const authReducer = authSlice.reducer;
export default authReducer;

// ─── cartSlice ────────────────────────────────────────────────────────────────
interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  tableId: string | null;
  tableNumber: number | null;
}

const loadCart = (): CartState => {
  if (typeof window === 'undefined') return { items: [], tableId: null, tableNumber: null };
  try {
    return JSON.parse(localStorage.getItem('ros_cart') || 'null') || { items: [], tableId: null, tableNumber: null };
  } catch { return { items: [], tableId: null, tableNumber: null }; }
};

const saveCart = (state: CartState) => {
  if (typeof window !== 'undefined') localStorage.setItem('ros_cart', JSON.stringify(state));
};

const cartSliceObj = createSlice({
  name: 'cart',
  initialState: loadCart,
  reducers: {
    setTable: (state, action: PayloadAction<{ tableId: string; tableNumber: number }>) => {
      state.tableId = action.payload.tableId;
      state.tableNumber = action.payload.tableNumber;
      saveCart({ ...state });
    },
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(i => i.menuItemId === action.payload.menuItemId);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      saveCart({ ...state, items: [...state.items] });
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.menuItemId !== action.payload);
      saveCart({ ...state });
    },
    updateQuantity: (state, action: PayloadAction<{ menuItemId: string; quantity: number }>) => {
      const item = state.items.find(i => i.menuItemId === action.payload.menuItemId);
      if (item) {
        if (action.payload.quantity <= 0) {
          state.items = state.items.filter(i => i.menuItemId !== action.payload.menuItemId);
        } else {
          item.quantity = action.payload.quantity;
        }
      }
      saveCart({ ...state, items: [...state.items] });
    },
    clearCart: (state) => {
      state.items = [];
      if (typeof window !== 'undefined') localStorage.removeItem('ros_cart');
    },
  },
});

export const { setTable, addItem, removeItem, updateQuantity, clearCart } = cartSliceObj.actions;
export const cartReducer = cartSliceObj.reducer;

// ─── menuSlice ────────────────────────────────────────────────────────────────
interface MenuState {
  categories: any[];
  items: any[];
  loading: boolean;
  error: string | null;
  activeCategory: string | null;
  searchQuery: string;
}

const menuSliceObj = createSlice({
  name: 'menu',
  initialState: { categories: [], items: [], loading: false, error: null, activeCategory: null, searchQuery: '' } as MenuState,
  reducers: {
    setMenuData: (state, action: PayloadAction<{ categories: any[]; items: any[] }>) => {
      state.categories = action.payload.categories;
      state.items = action.payload.items;
    },
    setLoading: (state, action: PayloadAction<boolean>) => { state.loading = action.payload; },
    setActiveCategory: (state, action: PayloadAction<string | null>) => { state.activeCategory = action.payload; },
    setSearchQuery: (state, action: PayloadAction<string>) => { state.searchQuery = action.payload; },
    setError: (state, action: PayloadAction<string | null>) => { state.error = action.payload; },
  },
});

export const { setMenuData, setLoading, setActiveCategory, setSearchQuery, setError } = menuSliceObj.actions;
export const menuReducer = menuSliceObj.reducer;

// ─── orderSlice ───────────────────────────────────────────────────────────────
interface OrderState {
  currentOrder: any | null;
  orders: any[];
  loading: boolean;
}

const orderSliceObj = createSlice({
  name: 'orders',
  initialState: { currentOrder: null, orders: [], loading: false } as OrderState,
  reducers: {
    setCurrentOrder: (state, action: PayloadAction<any>) => { state.currentOrder = action.payload; },
    setOrders: (state, action: PayloadAction<any[]>) => { state.orders = action.payload; },
    updateOrderStatus: (state, action: PayloadAction<{ orderId: string; status: string }>) => {
      if (state.currentOrder?._id === action.payload.orderId) {
        state.currentOrder.status = action.payload.status;
      }
      const order = state.orders.find(o => o._id === action.payload.orderId);
      if (order) order.status = action.payload.status;
    },
    addOrder: (state, action: PayloadAction<any>) => {
      state.orders.unshift(action.payload);
    },
    setOrderLoading: (state, action: PayloadAction<boolean>) => { state.loading = action.payload; },
  },
});

export const { setCurrentOrder, setOrders, updateOrderStatus, addOrder, setOrderLoading } = orderSliceObj.actions;
export const orderReducer = orderSliceObj.reducer;
