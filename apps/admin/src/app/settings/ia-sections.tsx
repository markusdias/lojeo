'use client';

import { InfoTooltip } from '@/components/ui/info-tooltip';

// ─── Brand Guide ───────────────────────────────────────────────────────────────

interface BrandGuide {
  brandName?: string;
  tonePersonality?: string;
  vocabPreferred?: string;
  vocabAvoid?: string;
  examples?: string;
  aiMonthlyLimitCents?: number;
}

const BRAND_TEMPLATES: Array<{
  label: string;
  emoji: string;
  data: Omit<BrandGuide, 'brandName' | 'aiMonthlyLimitCents'>;
}> = [
  {
    label: 'Joias Premium',
    emoji: '💎',
    data: {
      tonePersonality: 'Luxo atemporal sem ostentação. Voz ativa, storytelling com fatos do material. Sem emoji. Frases curtas e impactantes. Celebra a singularidade de cada peça.',
      vocabPreferred: 'artesanal, certificado, atemporal, garimpado, singular, heirloom, requintado',
      vocabAvoid: 'exclusivo, viral, trending, barato, promoção, econômico, oferta',
      examples: 'Ouro 18k certificado, com 8 horas de trabalho artesanal por peça.\nQuartzo rosa garimpado individualmente — cada pedra guarda uma história única.\nDesenhado para ser passado de geração em geração.',
    },
  },
  {
    label: 'Moda Casual',
    emoji: '👕',
    data: {
      tonePersonality: 'Descolado e próximo. Tom de conversa entre amigos, sem formalidade. Celebra autenticidade e o dia a dia. Direto, sem floreios.',
      vocabPreferred: 'confortável, versátil, autêntico, do seu jeito, para a vida real, sem complicação',
      vocabAvoid: 'elegante, sofisticado, exclusivo, curado, selecionado a dedo',
      examples: 'Feito pra viver, não pra guardar no armário.\nDo café da manhã ao happy hour — sem precisar trocar de roupa.\nConforto que parece aquela peça que você já lavou cem vezes.',
    },
  },
  {
    label: 'Artesanal',
    emoji: '🪡',
    data: {
      tonePersonality: 'Caloroso e humano. Conta a história das mãos que fizeram. Imperfeições são charme, não defeito. Valorizaprocesso e rastreabilidade.',
      vocabPreferred: 'feito à mão, único, história, processo, produtor, lote pequeno, rastreável',
      vocabAvoid: 'uniforme, industrial, fabricado em série, padronizado',
      examples: 'Cada peça tem variações sutis — marca de quem foi feito por uma pessoa, não por uma máquina.\nProduzido em lote de 20 unidades. Quando acabar, não repete.\nA imperfeição é intencional: é o que faz seu ser único.',
    },
  },
  {
    label: 'Tech / Gadgets',
    emoji: '⚡',
    data: {
      tonePersonality: 'Direto ao ponto. Specs primeiro, benefício em seguida. Zero jargão desnecessário. O usuário é inteligente — respeite isso.',
      vocabPreferred: 'compatível, eficiente, precisão, durabilidade, confiável, testado, certificado',
      vocabAvoid: 'revolucionário, incrível, game-changer, inovador, disruptivo, imbatível',
      examples: 'Bateria 5.000 mAh. Carrega em 45 minutos. Dura 2 dias de uso intenso.\nIP68: testado a 1,5m de profundidade por 30 minutos.\nCompatível com iOS 16+ e Android 12+. Sem necessidade de app adicional.',
    },
  },
];

interface BrandGuideSectionProps {
  brandGuide?: BrandGuide;
  onChange: (patch: Partial<BrandGuide>) => void;
}

export function BrandGuideSection({ brandGuide, onChange }: BrandGuideSectionProps) {
  function applyTemplate(tpl: typeof BRAND_TEMPLATES[number]) {
    onChange(tpl.data);
  }

  return (
    <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h2 className="font-semibold text-lg">Brand Guide para IA</h2>
        <p className="text-xs text-neutral-500 mt-1">
          Define tom, vocabulário e exemplos que a IA usa ao gerar descrições de produtos, SEO e sugestões de copy.
          Quanto mais completo, mais a IA escreve no estilo da sua marca.
        </p>
      </div>

      {/* Template shortcuts */}
      <div>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>
          Comece com um template e ajuste:
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BRAND_TEMPLATES.map(tpl => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => applyTemplate(tpl)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 13,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                cursor: 'pointer',
                transition: 'background 120ms, border-color 120ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
            >
              <span>{tpl.emoji}</span>
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Nome da marca (usado nos prompts)</label>
          <input
            type="text"
            value={brandGuide?.brandName ?? ''}
            onChange={e => onChange({ brandName: e.target.value })}
            placeholder="Atelier Joias"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Gasto mensal máximo IA (R$ — 0 = sem limite)
            <InfoTooltip text="Acima desse valor, a geração de textos para automaticamente até o próximo mês. Cada descrição custa ~R$ 0,05. 0 = sem limite." />
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={(brandGuide?.aiMonthlyLimitCents ?? 0) / 100}
            onChange={e => onChange({ aiMonthlyLimitCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
            placeholder="50"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Tom e personalidade</label>
        <textarea
          rows={3}
          value={brandGuide?.tonePersonality ?? ''}
          onChange={e => onChange({ tonePersonality: e.target.value })}
          placeholder="Ex: Luxo atemporal, sem ostentação. Voz ativa. Frases curtas. Sem emoji."
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <p className="text-xs text-neutral-400 mt-1">
          Escreva como você falaria pra um redator novo que nunca viu sua loja.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Palavras que você usa (separadas por vírgula)
          </label>
          <input
            type="text"
            value={brandGuide?.vocabPreferred ?? ''}
            onChange={e => onChange({ vocabPreferred: e.target.value })}
            placeholder="artesanal, certificado, atemporal"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Palavras que você evita (separadas por vírgula)
          </label>
          <input
            type="text"
            value={brandGuide?.vocabAvoid ?? ''}
            onChange={e => onChange({ vocabAvoid: e.target.value })}
            placeholder="exclusivo, viral, trending"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Exemplos de texto aprovado pela sua marca (1 por linha)
        </label>
        <textarea
          rows={4}
          value={brandGuide?.examples ?? ''}
          onChange={e => onChange({ examples: e.target.value })}
          placeholder={'Quartzo rosa garimpado individualmente, cada peça única em sua jornada.\nOuro 18k certificado, com 8 horas de trabalho artesanal por peça.\nDesenhado para durar gerações — não uma temporada.'}
          className="w-full border rounded px-3 py-2 text-sm font-mono text-xs"
        />
        <p className="text-xs text-neutral-400 mt-1">
          3–5 exemplos reais fazem a IA imitar seu estilo com muito mais precisão do que qualquer instrução.
        </p>
      </div>
    </div>
  );
}

// ─── Rate Limit IA Analyst ──────────────────────────────────────────────────

interface RateLimit {
  perMinute?: number;
  perDay?: number;
}

const PRESETS: Array<{ label: string; hint: string; perMinute: number; perDay: number }> = [
  { label: 'Leve',      hint: 'Sou só eu na loja',       perMinute: 3,  perDay: 50  },
  { label: 'Padrão',    hint: 'Recomendado',              perMinute: 10, perDay: 200 },
  { label: 'Intensivo', hint: 'Time usa bastante',        perMinute: 20, perDay: 500 },
];

function detectPreset(v?: RateLimit): string {
  const pm = v?.perMinute ?? 10;
  const pd = v?.perDay ?? 200;
  const match = PRESETS.find(p => p.perMinute === pm && p.perDay === pd);
  return match?.label ?? 'Personalizado';
}

interface RateLimitSectionProps {
  value?: RateLimit;
  onChange: (v: RateLimit) => void;
}

export function RateLimitSection({ value, onChange }: RateLimitSectionProps) {
  const activePreset = detectPreset(value);
  const isCustom = activePreset === 'Personalizado';

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
      <h3 className="font-semibold text-sm" style={{ marginBottom: 4 }}>Uso do IA Analyst por pessoa</h3>
      <p className="text-xs text-neutral-500" style={{ marginBottom: 'var(--space-4)' }}>
        O <strong>IA Analyst</strong> é o chat onde você pergunta sobre sua loja —
        ex: <em>"Qual produto vendeu mais essa semana?"</em> ou <em>"Quais clientes não compram há 30 dias?"</em>.
        Cada pergunta consome tokens da sua cota. Este limite evita que um usuário do time esgote a cota sozinho.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
        {PRESETS.map(p => {
          const active = activePreset === p.label;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ perMinute: p.perMinute, perDay: p.perDay })}
              style={{
                flex: 1,
                minWidth: 120,
                padding: '10px 14px',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10,
                background: active ? 'var(--accent-soft, #fdf8ee)' : 'var(--bg-elevated)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 120ms, background 120ms',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: 'var(--fg)', marginBottom: 2 }}>
                {p.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{p.hint}</div>
              <div style={{ fontSize: 11, color: active ? 'var(--accent)' : 'var(--fg-muted)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
                {p.perMinute}/min · {p.perDay}/dia
              </div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange({ perMinute: value?.perMinute ?? 10, perDay: value?.perDay ?? 200 })}
          style={{
            flex: 1,
            minWidth: 120,
            padding: '10px 14px',
            border: `1px solid ${isCustom ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10,
            background: isCustom ? 'var(--accent-soft, #fdf8ee)' : 'var(--bg-elevated)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: isCustom ? 600 : 500, color: 'var(--fg)', marginBottom: 2 }}>
            Personalizado
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Defina seus números</div>
        </button>
      </div>

      {isCustom && (
        <div className="grid grid-cols-2 gap-4" style={{ marginTop: 'var(--space-3)' }}>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Perguntas por minuto
              <InfoTooltip text="Máximo por usuário por minuto. Se ultrapassar, o chat pede pra aguardar alguns segundos." />
            </label>
            <input
              type="number"
              min={1} max={120} step={1}
              value={value?.perMinute ?? 10}
              onChange={e => onChange({ ...value, perMinute: Math.max(1, Math.min(120, parseInt(e.target.value || '10', 10))) })}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Perguntas por dia
              <InfoTooltip text="Máximo por usuário por dia. Reseta à meia-noite (horário de Brasília)." />
            </label>
            <input
              type="number"
              min={1} max={10000} step={1}
              value={value?.perDay ?? 200}
              onChange={e => onChange({ ...value, perDay: Math.max(1, Math.min(10_000, parseInt(e.target.value || '200', 10))) })}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
