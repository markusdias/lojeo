import type { TemplateConfig } from '@lojeo/engine';

export const jewelryV1: TemplateConfig = {
  id: 'jewelry-v1',
  name: 'Joias — Premium BR',
  description: 'Joalheria contemporânea em ouro 18k e prata 925, com garantia de um ano.',
  tagline: 'Atelier de joias autorais.',
  locale: 'pt-BR',
  currency: 'BRL',
  fields: {
    material: {
      label: 'Material',
      type: 'select',
      options: ['Ouro 18k', 'Ouro 14k', 'Prata 925', 'Aço cirúrgico', 'Banhado a ouro'],
      required: true,
    },
    pedra: {
      label: 'Pedra principal',
      type: 'select',
      options: ['Diamante', 'Brilhante', 'Esmeralda', 'Rubi', 'Safira', 'Pérola', 'Sem pedra'],
    },
    quilate: { label: 'Quilate (ct)', type: 'number' },
    tamanho: { label: 'Tamanho', type: 'text' },
    aro: { label: 'Aro (anel)', type: 'select', options: ['10', '12', '14', '16', '18', '20', '22', '24'] },
  },
  typography: {
    combos: [
      {
        id: 'classico-luxo',
        label: 'Clássico & Luxo',
        heading: 'Playfair Display',
        body: 'Inter',
        mono: 'JetBrains Mono',
      },
      {
        id: 'editorial-moderno',
        label: 'Editorial Moderno',
        heading: 'EB Garamond',
        body: 'Plus Jakarta Sans',
        mono: 'JetBrains Mono',
      },
      {
        id: 'minimalista-contemporaneo',
        label: 'Minimalista Contemporâneo',
        heading: 'Outfit',
        body: 'Inter',
        mono: 'JetBrains Mono',
      },
    ],
    default: 'classico-luxo',
  },
  palette: {
    primary: '#1a1a1a',
    accent: '#b08d4c',
    surface: '#fbf9f4',
    text: '#1a1a1a',
  },
};

export default jewelryV1;
