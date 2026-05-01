import { cache } from 'react';
import { db, tenants } from '@lojeo/db';
import { eq } from 'drizzle-orm';

export interface PixelConfig {
  gtmId?: string;
  gaTrackingId?: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
  clarityProjectId?: string;
  googleAdsConversionId?: string;
}

export interface AppearanceConfig {
  typo?: string;
  accent?: string;
  bgTone?: string;
  imgRadius?: '0' | '8' | '16';
  typeScale?: 'default' | 'larger' | 'smaller';
  photoStyle?: 'isolated' | 'lifestyle' | 'mix';
  hero?: 'image' | 'video' | 'carousel' | 'grid';
  homepageSections?: { id: string; off?: boolean }[];
  trustSignals?: string[];
  slogan?: string;
  tagline?: string;
  aiTone?: string;
  aiPerson?: string;
  preferWords?: string;
  avoidWords?: string;
}

export interface BrandGuideConfig {
  brandName?: string;
  tonePersonality?: string;
  vocabPreferred?: string;
  vocabAvoid?: string;
  examples?: string;
}

export interface MaintenanceConfig {
  enabled: boolean;
  message: string;            // mostrado pro cliente em /manutencao
  etaIso?: string;            // ISO 8601 datetime — "voltamos às X"
  bypassToken?: string;       // 32 bytes hex; cliente com cookie igual a este passa
  contactEmail?: string;      // override de config.contactEmail (opcional)
}

export const DEFAULT_MAINTENANCE: MaintenanceConfig = {
  enabled: false,
  message: 'Estamos fazendo melhorias',
};

export interface TenantRuntimeConfig {
  pixels: PixelConfig;
  appearance: AppearanceConfig;
  brandGuide: BrandGuideConfig;
  maintenance: MaintenanceConfig;
}

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export const getTenantRuntimeConfig = cache(async (): Promise<TenantRuntimeConfig> => {
  try {
    const [tenant] = await db.select({ config: tenants.config }).from(tenants).where(eq(tenants.id, tenantId())).limit(1);
    const cfg = (tenant?.config ?? {}) as {
      pixels?: PixelConfig;
      appearance?: AppearanceConfig;
      brandGuide?: BrandGuideConfig;
      maintenance?: Partial<MaintenanceConfig>;
    };
    return {
      pixels: cfg.pixels ?? {},
      appearance: cfg.appearance ?? {},
      brandGuide: cfg.brandGuide ?? {},
      maintenance: { ...DEFAULT_MAINTENANCE, ...(cfg.maintenance ?? {}) },
    };
  } catch {
    return { pixels: {}, appearance: {}, brandGuide: {}, maintenance: DEFAULT_MAINTENANCE };
  }
});

export const DEFAULT_HOMEPAGE_SECTIONS: { id: string; off: boolean }[] = [
  { id: 'hero', off: false },
  { id: 'collections', off: false },
  { id: 'continueWhereLeftOff', off: false },
  { id: 'recommendedForYou', off: false },
  { id: 'anonAffinity', off: false },
  { id: 'new', off: false },
  { id: 'about', off: false },
  { id: 'reviews', off: true },
  { id: 'ugc', off: false },
  { id: 'trust', off: false },
  { id: 'blog', off: true },
];

export function resolveHomepageSections(
  appearance: AppearanceConfig,
): { id: string; off: boolean }[] {
  const saved = appearance.homepageSections;
  if (!saved || saved.length === 0) return DEFAULT_HOMEPAGE_SECTIONS;
  const known = new Set(DEFAULT_HOMEPAGE_SECTIONS.map(s => s.id));
  const ordered = saved
    .filter(s => known.has(s.id))
    .map(s => ({ id: s.id, off: !!s.off }));
  const orderedIds = new Set(ordered.map(s => s.id));
  for (const def of DEFAULT_HOMEPAGE_SECTIONS) {
    if (!orderedIds.has(def.id)) ordered.push(def);
  }
  return ordered;
}

export const DEFAULT_TRUST_SIGNALS = ['shipping', 'warranty', 'returns', 'payment'];
