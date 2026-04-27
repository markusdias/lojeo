import { registerTemplate, loadTemplate, type TemplateConfig } from '@lojeo/engine';
import { jewelryV1 } from '@lojeo/template-jewelry-v1';
import { coffeeV1 } from '@lojeo/template-coffee-v1';

registerTemplate('jewelry-v1', async () => jewelryV1);
registerTemplate('coffee-v1', async () => coffeeV1);

export async function getActiveTemplate(): Promise<TemplateConfig> {
  const id = process.env.TEMPLATE_ID ?? 'jewelry-v1';
  return loadTemplate(id);
}
