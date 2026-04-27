import type { TemplateConfig } from '@lojeo/engine';

/**
 * Coffee — international café template (Fase 1.2).
 *
 * Mood: artisan/specialty café. EN-US locale, USD currency. International
 * shipping (DHL/FedEx). Niche fields cover specialty coffee taxonomy:
 * origin, process, roast level, sensory notes (acidity/sweetness/body).
 */
export const coffeeV1: TemplateConfig = {
  id: 'coffee-v1',
  name: 'Coffee — International Specialty',
  locale: 'en-US',
  currency: 'USD',
  fields: {
    origin: {
      label: 'Origin',
      type: 'select',
      options: [
        'Ethiopia',
        'Colombia',
        'Brazil',
        'Kenya',
        'Guatemala',
        'Costa Rica',
        'Honduras',
        'Panama',
        'Rwanda',
        'Indonesia',
        'Yemen',
      ],
      required: true,
    },
    process: {
      label: 'Process',
      type: 'select',
      options: ['Washed', 'Natural', 'Honey', 'Anaerobic', 'Wet hulled'],
      required: true,
    },
    roast: {
      label: 'Roast level',
      type: 'select',
      options: ['Light', 'Medium-light', 'Medium', 'Medium-dark', 'Dark'],
      required: true,
    },
    altitude: { label: 'Altitude (masl)', type: 'number' },
    variety: { label: 'Variety / cultivar', type: 'text' },
    notes: { label: 'Tasting notes', type: 'text' },
    acidity: {
      label: 'Acidity',
      type: 'select',
      options: ['Low', 'Medium', 'High', 'Bright'],
    },
    body: {
      label: 'Body',
      type: 'select',
      options: ['Light', 'Medium', 'Full', 'Syrupy'],
    },
    sweetness: {
      label: 'Sweetness',
      type: 'select',
      options: ['Subtle', 'Balanced', 'Pronounced'],
    },
  },
  typography: {
    combos: [
      {
        id: 'editorial-warm',
        label: 'Editorial Warm',
        heading: 'Fraunces',
        body: 'Inter',
        mono: 'JetBrains Mono',
      },
      {
        id: 'craft-modern',
        label: 'Craft Modern',
        heading: 'DM Serif Display',
        body: 'DM Sans',
        mono: 'JetBrains Mono',
      },
      {
        id: 'roastery-clean',
        label: 'Roastery Clean',
        heading: 'Manrope',
        body: 'Manrope',
        mono: 'JetBrains Mono',
      },
    ],
    default: 'editorial-warm',
  },
  palette: {
    primary: '#2C1810', // espresso dark
    accent: '#8B5A3C',  // roasted bean caramel
    surface: '#F8F4ED', // warm paper
    text: '#1F1410',
  },
};

export default coffeeV1;
