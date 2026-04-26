import { registerTemplate, loadTemplate, type TemplateConfig } from '@lojeo/engine';
import { jewelryV1 } from '@lojeo/template-jewelry-v1';

registerTemplate('jewelry-v1', async () => jewelryV1);

export async function getActiveTemplate(): Promise<TemplateConfig> {
  const id = process.env.TEMPLATE_ID ?? 'jewelry-v1';
  return loadTemplate(id);
}
