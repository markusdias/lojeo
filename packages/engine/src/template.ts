import { z } from 'zod';

export const TemplateConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  locale: z.string(),
  currency: z.string().length(3),
  fields: z.record(
    z.string(),
    z.object({
      label: z.string(),
      type: z.enum(['text', 'number', 'select', 'multi-select']),
      options: z.array(z.string()).optional(),
      required: z.boolean().optional(),
    }),
  ),
  typography: z.object({
    combos: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          heading: z.string(),
          body: z.string(),
          mono: z.string().optional(),
        }),
      )
      .min(1),
    default: z.string(),
  }),
  palette: z.object({
    primary: z.string(),
    accent: z.string(),
    surface: z.string(),
    text: z.string(),
  }),
});

export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

const TEMPLATE_REGISTRY = new Map<string, () => Promise<TemplateConfig>>();

export function registerTemplate(id: string, loader: () => Promise<TemplateConfig>): void {
  TEMPLATE_REGISTRY.set(id, loader);
}

export async function loadTemplate(id: string): Promise<TemplateConfig> {
  const loader = TEMPLATE_REGISTRY.get(id);
  if (!loader) throw new Error(`Template "${id}" não registrado`);
  const cfg = await loader();
  return TemplateConfigSchema.parse(cfg);
}

export function templateIds(): string[] {
  return [...TEMPLATE_REGISTRY.keys()];
}
