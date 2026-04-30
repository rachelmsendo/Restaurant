'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Image { url: string; publicId?: string; isCover?: boolean; }

export function ImageGallery({ images, name }: { images: Image[]; name: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-stone-100 rounded-2xl flex items-center justify-center text-5xl">
        🍽️
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        {/* Main image */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 cursor-zoom-in"
          onClick={() => setLightbox(true)}>
          <img src={images[active].url} alt={`${name} - image ${active + 1}`}
            className="w-full h-full object-cover transition-opacity duration-300" />
          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">
              {active + 1}/{images.length}
            </div>
          )}
          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setActive(p => (p - 1 + images.length) % images.length); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all">‹</button>
              <button onClick={e => { e.stopPropagation(); setActive(p => (p + 1) % images.length); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all">›</button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 mt-2">
            {images.map((img, idx) => (
              <button key={idx} onClick={() => setActive(idx)}
                className={cn('w-14 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0',
                  active === idx ? 'border-brand-500' : 'border-transparent hover:border-stone-300')}>
                <img src={img.url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl w-10 h-10 flex items-center justify-center">×</button>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <img src={images[active].url} alt={name} className="max-w-full max-h-[85vh] object-contain mx-auto rounded-xl" />
            {images.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {images.map((img, idx) => (
                  <button key={idx} onClick={() => setActive(idx)}
                    className={cn('w-12 h-8 rounded-lg overflow-hidden border-2 transition-all',
                      active === idx ? 'border-brand-500' : 'border-white/20')}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-between mt-4">
              <button onClick={() => setActive(p => (p-1+images.length)%images.length)}
                className="text-white/70 hover:text-white px-4 py-2 bg-white/10 rounded-xl transition-all">← Prev</button>
              <button onClick={() => setActive(p => (p+1)%images.length)}
                className="text-white/70 hover:text-white px-4 py-2 bg-white/10 rounded-xl transition-all">Next →</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
