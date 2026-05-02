import { Suspense } from 'react';
import MenuPageClient from './MenuPageClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading menu...</div>}>
      <MenuPageClient />
    </Suspense>
  );
}