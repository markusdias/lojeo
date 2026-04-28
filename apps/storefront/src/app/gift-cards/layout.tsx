import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gift cards — Atelier',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
