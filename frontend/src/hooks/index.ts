import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import type { RootState } from '@/store';

// ─── useSocket ───────────────────────────────────────────────────────────────
/**
 * Connect to socket on mount, join a room, and disconnect on unmount.
 */
export function useSocket(room: 'kitchen' | 'admin' | null, tableId?: string) {
  const connected = useRef(false);

  useEffect(() => {
    if (connected.current) return;
    const socket = connectSocket();
    connected.current = true;

    if (room === 'kitchen') socket.emit('join_kitchen');
    else if (room === 'admin') socket.emit('join_admin');
    else if (tableId) socket.emit('join_table', { tableId });

    return () => {
      disconnectSocket();
      connected.current = false;
    };
  }, [room, tableId]);
}

// ─── useSocketEvent ───────────────────────────────────────────────────────────
/**
 * Subscribe to a socket event. Handles cleanup on unmount.
 */
export function useSocketEvent<T = any>(event: string, handler: (data: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = connectSocket();
    const cb = (data: T) => handlerRef.current(data);
    socket.on(event, cb);
    return () => { socket.off(event, cb); };
  }, [event]);
}

// ─── useOrderPolling ─────────────────────────────────────────────────────────
/**
 * Poll an endpoint every `interval` ms. Returns refresh function.
 */
export function usePolling(fetchFn: () => Promise<void>, intervalMs = 30000) {
  const timerRef = useRef<NodeJS.Timeout>();

  const start = useCallback(() => {
    fetchFn();
    timerRef.current = setInterval(fetchFn, intervalMs);
  }, [fetchFn, intervalMs]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  return { refresh: fetchFn };
}

// ─── useCart ──────────────────────────────────────────────────────────────────
/**
 * Convenience hook: cart derived values.
 */
export function useCart() {
  const cart = useSelector((s: RootState) => s.cart);
  const itemCount = cart.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
  const subtotal = cart.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  return { ...cart, itemCount, subtotal, tax, total };
}

// ─── useAuth ─────────────────────────────────────────────────────────────────
export function useAuth() {
  return useSelector((s: RootState) => s.auth);
}

// ─── useDebounce ─────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// need useState for useDebounce
import { useState } from 'react';
