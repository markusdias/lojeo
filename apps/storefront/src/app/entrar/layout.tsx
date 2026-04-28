import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrar — Atelier',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
