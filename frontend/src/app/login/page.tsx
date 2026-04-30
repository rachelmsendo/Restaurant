'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { login } from '@/store/slices/authSlice';
import type { RootState, AppDispatch } from '@/store';
import { Spinner } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, token, user } = useSelector((s: RootState) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (token && user) {
      router.replace(user.role === 'kitchen' ? '/kitchen' : '/admin');
    }
  }, [token, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      toast.success(`Welcome back!`);
      router.replace(result.payload.user.role === 'kitchen' ? '/kitchen' : '/admin');
    } else {
      toast.error(result.payload as string || 'Login failed');
    }
  };

  const fillDemo = (role: 'admin' | 'kitchen') => {
    setEmail(role === 'admin' ? 'admin@restaurantos.com' : 'kitchen@restaurantos.com');
    setPassword(role === 'admin' ? 'Admin1234!' : 'Kitchen1234!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-400/5 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-card-lg">🍽️</div>
          <h1 className="text-2xl font-bold text-white">RestaurantOS</h1>
          <p className="text-stone-400 text-sm mt-1">Staff & admin sign in</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1.5 block">Email address</label>
              <input className="input" type="email" placeholder="admin@restaurantos.com"
                value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 mb-1.5 block">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full h-12 text-base mt-2">
              {loading ? <Spinner size="sm" /> : 'Sign In →'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-stone-100">
            <p className="text-xs text-center text-stone-400 mb-3">Try with demo credentials</p>
            <div className="grid grid-cols-2 gap-2">
              {(['admin', 'kitchen'] as const).map(role => (
                <button key={role} onClick={() => fillDemo(role)}
                  className="py-2 px-3 bg-stone-50 hover:bg-stone-100 rounded-xl text-xs font-medium text-stone-700 transition-all capitalize">
                  {role === 'admin' ? '👤' : '👨‍🍳'} {role} demo
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-stone-500 text-xs mt-5">Customer? Scan the QR code at your table.</p>
      </motion.div>
    </div>
  );
}
