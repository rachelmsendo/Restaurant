'use client';
import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ImageSlot {
  url: string;
  publicId: string;
  isCover: boolean;
  isNew?: boolean;
  file?: File;
  preview?: string;
}

interface Props {
  images: ImageSlot[];
  onChange: (images: ImageSlot[], newFiles: File[]) => void;
  onRemove: (publicId: string) => void;
  maxImages?: number;
}

export default function ImageUploader({ images, onChange, onRemove, maxImages = 5 }: Props) {
  const [draggingOver, setDraggingOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const remaining = maxImages - images.length;
    if (remaining <= 0) return;
    const toAdd = arr.slice(0, remaining).filter(f => f.type.startsWith('image/'));

    const newSlots: ImageSlot[] = toAdd.map((file, idx) => ({
      url: URL.createObjectURL(file),
      publicId: `new_${Date.now()}_${idx}`,
      isCover: images.length === 0 && idx === 0,
      isNew: true,
      file,
      preview: URL.createObjectURL(file),
    }));

    onChange([...images, ...newSlots], toAdd);
  }, [images, maxImages, onChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const setCover = (publicId: string) => {
    onChange(images.map(img => ({ ...img, isCover: img.publicId === publicId })), []);
  };

  const removeImage = (img: ImageSlot) => {
    if (!img.isNew) onRemove(img.publicId);
    onChange(images.filter(i => i.publicId !== img.publicId), []);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">
          Photos ({images.length}/{maxImages})
        </label>
        {images.length > 0 && (
          <span className="text-xs text-stone-400">Click ⭐ to set cover · First image is shown to customers</span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        {images.map((img, idx) => (
          <div key={img.publicId}
            className={cn('relative group rounded-xl overflow-hidden aspect-[4/3] bg-stone-100 border-2 transition-all',
              img.isCover ? 'border-brand-500 shadow-md' : 'border-transparent hover:border-stone-300')}>
            <img src={img.url} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />

            {/* Cover badge */}
            {img.isCover && (
              <div className="absolute top-2 left-2 bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                ⭐ Cover
              </div>
            )}

            {/* Hover controls */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {!img.isCover && (
                <button type="button" onClick={() => setCover(img.publicId)}
                  className="bg-white/90 text-stone-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-white transition-all">
                  ⭐ Set Cover
                </button>
              )}
              <button type="button" onClick={() => removeImage(img)}
                className="bg-red-500/90 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-500 transition-all">
                🗑️ Remove
              </button>
            </div>

            {/* Image number */}
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {idx + 1}
            </div>
          </div>
        ))}

        {/* Add slot */}
        {images.length < maxImages && (
          <button type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDraggingOver(true); }}
            onDragLeave={() => setDraggingOver(false)}
            onDrop={handleDrop}
            className={cn(
              'aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer',
              draggingOver ? 'border-brand-500 bg-brand-50' : 'border-stone-300 hover:border-brand-400 hover:bg-stone-50'
            )}>
            <span className="text-2xl">📷</span>
            <span className="text-xs text-stone-500 font-medium text-center px-2">
              {draggingOver ? 'Drop here' : `Add photo\n(${images.length}/${maxImages})`}
            </span>
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {images.length === 0 && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDraggingOver(true); }}
          onDragLeave={() => setDraggingOver(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
            draggingOver ? 'border-brand-500 bg-brand-50' : 'border-stone-300 hover:border-brand-400 hover:bg-stone-50'
          )}>
          <span className="text-4xl block mb-2">🖼️</span>
          <p className="text-sm font-medium text-stone-700 mb-1">Drag & drop photos or click to upload</p>
          <p className="text-xs text-stone-400">Up to {maxImages} images · JPG, PNG, WebP · Max 8MB each</p>
        </div>
      )}
    </div>
  );
}
