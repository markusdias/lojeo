import { SkeletonGrid, SkeletonPageHeader } from '../components/ui/state-skeleton';

/**
 * Loading global — usado pelo Next 15 quando rota ainda nao streamou.
 * Identidade jewelry-v1: shimmer suave em surface-sunken, tipografia display
 * deixada de fora (skeleton e ornamento, nao texto).
 */
export default function Loading() {
  return (
    <div
      style={{
        maxWidth: 'var(--container-max)',
        margin: '0 auto',
        padding: '40px var(--container-pad) 80px',
      }}
    >
      <SkeletonPageHeader />
      <SkeletonGrid count={8} columns={4} />
    </div>
  );
}
