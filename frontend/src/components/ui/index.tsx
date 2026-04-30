'use client';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function MenuItemSkeleton() {
  return (
    <div className="card p-4 flex gap-3">
      <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm'|'md'|'lg'; className?: string }) {
  const s = { sm:'w-4 h-4 border-2', md:'w-6 h-6 border-2', lg:'w-10 h-10 border-3' }[size];
  return <div className={cn('rounded-full border-stone-200 border-t-brand-500 animate-spin', s, className)} />;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-5xl mb-3 block">{icon}</span>
      <h3 className="text-base font-semibold text-stone-700">{title}</h3>
      {description && <p className="text-sm text-stone-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Modal (bottom-sheet on mobile) ──────────────────────────────────────────
export function Modal({ isOpen, onClose, children, title, size='md' }: {
  isOpen: boolean; onClose: () => void; children: React.ReactNode;
  title?: string; size?: 'sm'|'md'|'lg'|'xl';
}) {
  useEffect(() => {
    if (isOpen) { document.body.style.overflow = 'hidden'; }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  if (!isOpen) return null;
  const maxW = { sm:'sm:max-w-sm', md:'sm:max-w-lg', lg:'sm:max-w-2xl', xl:'sm:max-w-4xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[94vh] flex flex-col', maxW)}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 text-xl leading-none">×</button>
          </div>
        )}
        {!title && (
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-stone-200 rounded-full" />
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// ─── Quantity Stepper ─────────────────────────────────────────────────────────
export function QuantityStepper({ value, onChange, min=1, max=99 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-1 bg-stone-100 rounded-full p-0.5">
      <button onClick={() => onChange(Math.max(min, value-1))}
        className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-stone-700 font-bold shadow-sm hover:bg-stone-50 active:scale-95 transition-all text-sm">−</button>
      <span className="w-6 text-center font-semibold text-sm tabular-nums">{value}</span>
      <button onClick={() => onChange(Math.min(max, value+1))}
        className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shadow-sm hover:bg-brand-600 active:scale-95 transition-all text-sm">+</button>
    </div>
  );
}

// ─── Image Gallery (1–5 images with primary + thumbnails) ────────────────────
export function ImageGallery({ images, alt, className }: {
  images: Array<{ url: string; publicId?: string; isPrimary?: boolean }>;
  alt: string; className?: string;
}) {
  const [active, setActive] = useState(0);
  if (!images || images.length === 0) return (
    <div className={cn('bg-stone-100 flex items-center justify-center text-4xl', className)}>🍽️</div>
  );
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex-1 relative overflow-hidden rounded-xl bg-stone-100">
        <img src={images[active]?.url} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {active + 1}/{images.length}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={cn('flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all',
                active === i ? 'border-brand-500' : 'border-transparent opacity-60 hover:opacity-100')}>
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Multi Image Uploader (up to 5) ─────────────────────────────────────────
export function MultiImageUploader({ images, onChange, existingImages=[], onRemoveExisting, maxImages=5 }: {
  images: File[]; onChange: (files: File[]) => void;
  existingImages?: Array<{ url: string; publicId: string; isPrimary?: boolean }>;
  onRemoveExisting?: (idx: number) => void;
  maxImages?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const totalCount = existingImages.length + images.length;

  useEffect(() => {
    const urls = images.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [images]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const available = maxImages - totalCount;
    const toAdd = files.slice(0, available);
    onChange([...images, ...toAdd]);
    e.target.value = '';
  };

  const removeNew = (i: number) => {
    const copy = [...images]; copy.splice(i, 1); onChange(copy);
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {/* Existing images */}
        {existingImages.map((img, i) => (
          <div key={img.publicId} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-stone-200 group">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            {img.isPrimary && (
              <span className="absolute top-0.5 left-0.5 bg-brand-500 text-white text-[9px] px-1 rounded">Primary</span>
            )}
            {onRemoveExisting && (
              <button onClick={() => onRemoveExisting(i)}
                className="absolute inset-0 bg-red-500/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-lg font-bold">×</button>
            )}
          </div>
        ))}
        {/* New image previews */}
        {previews.map((url, i) => (
          <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-brand-300 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <span className="absolute top-0.5 right-0.5 bg-blue-500 text-white text-[9px] px-1 rounded">New</span>
            <button onClick={() => removeNew(i)}
              className="absolute inset-0 bg-red-500/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-lg font-bold">×</button>
          </div>
        ))}
        {/* Add button */}
        {totalCount < maxImages && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 hover:border-brand-400 flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-brand-500 transition-all">
            <span className="text-xl">+</span>
            <span className="text-[10px] font-medium">Add</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSelect} />
      </div>
      <p className="text-xs text-stone-400 mt-2">{totalCount}/{maxImages} images · First image is primary · Max 5MB each</p>
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
export function StarRating({ value, onChange, readonly=false, size='md' }: {
  value: number; onChange?: (v: number) => void; readonly?: boolean; size?: 'sm'|'md'|'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const sz = { sm:'text-sm', md:'text-xl', lg:'text-2xl' }[size];
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button" disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={cn(sz, 'transition-all', readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110')}>
          {star <= (hovered || value) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

// ─── Loading Page ─────────────────────────────────────────────────────────────
export function LoadingPage({ message='Loading…' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-3xl shadow-card-lg">🍽️</div>
      <Spinner size="lg" />
      <p className="text-stone-400 text-sm">{message}</p>
    </div>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel='Delete', danger=true }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; confirmLabel?: string; danger?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-5">
        <p className="text-sm text-stone-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={cn('flex-1 btn-primary', danger && 'bg-red-500 hover:bg-red-600')}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Toast helper (re-export pattern for components) ─────────────────────────
export { default as toast } from 'react-hot-toast';
