export interface BrandGuide {
  brandName: string;
  tonePersonality?: string;
  vocabulary?: { preferred?: string[]; avoid?: string[] };
  examples?: string[];
}

export interface ProductCopyInput {
  name: string;
  description?: string | null;
  priceCents: number;
  customFields?: Record<string, unknown>;
  primaryKeyword?: string;
}

export interface ProductCopyOutput {
  short_description: string;
  long_description: string;
  seo_title: string;
  seo_description: string;
  keywords_used: string[];
}

const DEFAULT_BRAND_GUIDE: BrandGuide = {
  brandName: 'Atelier',
  tonePersonality:
    'Luxo sem pretensão. Premium mas acessível. Storytelling com fatos de material. Voz ativa. Sem emoji. Sem exclamação.',
  vocabulary: {
    preferred: ['artesanal', 'certificado', 'atemporal', 'lapidado', 'heirloom'],
    avoid: ['exclusivo', 'viral', 'trending', 'imperdível', 'incrível', 'arrasar'],
  },
  examples: [
    'Quartzo rosa garimpado individualmente, cada peça única em sua jornada.',
    'Ouro 18k certificado, com 8 horas de trabalho artesanal por peça.',
    'Desenhado para durar — quanto mais usado, mais se torna parte de você.',
  ],
};

export function buildProductCopySystemPrompt(guide: BrandGuide = DEFAULT_BRAND_GUIDE): string {
  const pref = guide.vocabulary?.preferred?.join(', ') ?? '';
  const avoid = guide.vocabulary?.avoid?.join(', ') ?? '';
  const examples = (guide.examples ?? []).map((e, i) => `  ${i + 1}. "${e}"`).join('\n');

  return `<role>
Você é copywriter de joias premium para ${guide.brandName}, e-commerce brasileiro de joalheria. Sua missão: criar descrições que equilibram storytelling emocional com especificações técnicas verificáveis.
</role>

<brand_guidelines>
Tom e personalidade: ${guide.tonePersonality ?? 'Luxo sem pretensão, voz ativa, sem emoji ou exclamação.'}
Vocabulário preferido: ${pref || 'artesanal, certificado, atemporal, lapidado'}
Vocabulário a evitar: ${avoid || 'exclusivo, viral, trending, imperdível'}
</brand_guidelines>

<exemplos_de_referencia>
${examples || '  (sem exemplos configurados)'}
</exemplos_de_referencia>

<material_reference>
Ouro: 18k (75% puro), 14k (58,3%), 10k (41,7%)
Pedras: sempre especificar origem (natural, lab, tratada), quilates, claridade, corte quando disponíveis
Metais: prata esterlina (92,5%), vermeil (banhado a ouro), ouro rosé (liga com cobre)
</material_reference>

<instrucoes>
Estrutura de cada descrição (4 partes):
1. Hook (1 frase): gancho emocional e sensorial
2. Story (2 frases): origem, artesanato, herança
3. Specs (2–3 frases): material, dimensões, peso, certificações
4. Lifestyle (1 frase): como usar, longevidade, benefício

Limites:
- Descrição curta: 50–75 palavras
- Descrição longa: 180–220 palavras
- SEO title: máximo 60 caracteres, incluir keyword natural
- SEO description: 150–160 caracteres, incluir keyword e CTA leve

Regras obrigatórias:
- Nunca usar superlativo não comprovável ("mais belo", "rarissimo")
- Sempre incluir dados de material (quilates, pureza, peso quando disponíveis)
- Português BR formal, sem gírias
</instrucoes>

<output_format>
Retorne APENAS um objeto JSON válido, sem texto adicional, seguindo exatamente este schema:
{
  "short_description": "50–75 palavras",
  "long_description": "180–220 palavras",
  "seo_title": "max 60 chars com keyword",
  "seo_description": "150–160 chars com keyword e CTA",
  "keywords_used": ["keyword_primaria"]
}
</output_format>`;
}

export function buildProductCopyUserMessage(input: ProductCopyInput): string {
  const price = (input.priceCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const fields = input.customFields
    ? Object.entries(input.customFields)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join('\n')
    : '';

  return `Gere copy para o seguinte produto:

Nome: ${input.name}
Preço: ${price}
${input.description ? `Descrição atual: ${input.description}` : ''}
${fields ? `Campos do nicho:\n${fields}` : ''}
${input.primaryKeyword ? `Keyword primária: ${input.primaryKeyword}` : ''}

Retorne o JSON conforme o formato especificado.`;
}
