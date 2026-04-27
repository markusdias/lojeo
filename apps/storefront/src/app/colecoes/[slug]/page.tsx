import { redirect } from 'next/navigation';

interface CollectionDetailProps {
  params: Promise<{ slug: string }>;
}

// Cada coleção abre como PLP filtrada — preserva URL canônica /colecoes/<slug>
// mas reusa toda a lógica de listagem da PLP existente em /produtos.
export default async function CollectionDetailPage({ params }: CollectionDetailProps) {
  const { slug } = await params;
  redirect(`/produtos?colecao=${encodeURIComponent(slug)}`);
}
