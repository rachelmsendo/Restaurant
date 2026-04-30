// Core domain types

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'kitchen';
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: Category | string;
  image?: { url: string; publicId: string };
  ingredients?: string[];
  allergens?: string[];
  isAvailable: boolean;
  isPopular: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  preparationTime: number;
  sortOrder: number;
  createdAt: string;
}

export interface Table {
  _id: string;
  number: number;
  name: string;
  capacity: number;
  qrCode?: { url: string; imageData: string };
  status: 'available' | 'occupied' | 'reserved';
  isActive: boolean;
}

export interface OrderItem {
  menuItem: MenuItem | string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Order {
  _id: string;
  orderNumber: string;
  table: Table | string;
  tableNumber: number;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  estimatedReadyAt?: string;
  statusHistory: Array<{ status: string; updatedAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  order: Order | string;
  amount: number;
  currency: string;
  method: 'mpesa' | 'stripe' | 'cash';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  stripeClientSecret?: string;
  mpesaCheckoutRequestId?: string;
  mpesaReceiptNumber?: string;
  phoneNumber?: string;
  paidAt?: string;
  createdAt: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

// Socket events
export interface NewOrderEvent { order: Order; }
export interface OrderStatusEvent { orderId: string; orderNumber: string; status: OrderStatus; tableId: string; estimatedReadyAt?: string; }
export interface PaymentSuccessEvent { orderId: string; orderNumber: string; tableId: string; amount: number; }

// Cart
export interface CartItemType {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}
