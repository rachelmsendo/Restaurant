import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Menu | RestaurantOS',
  description: 'Browse our menu and order from your table',
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
