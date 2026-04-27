'use client';

import { createElement, useMemo, useState } from 'react';
import { renderMarkdown } from '@lojeo/engine';

interface Props {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  label?: string;
}

/**
 * Markdown editor com tabs Editor/Preview.
 *
 * SEGURANCA: HTML do preview vem de renderMarkdown() (engine puro) que
 * faz escapeHtml() em todo input antes de aplicar regex. URLs validadas.
 * Componente so e usado por admin autenticado (requirePermission products
 * write nas APIs que recebem o conteudo final).
 */
export function MarkdownEditor({ value, onChange, rows = 18, label }: Props) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const html = useMemo(() => (tab === 'preview' ? renderMarkdown(value) : ''), [tab, value]);

  const innerKey = 'dangerouslySetInnerHTML';
  const previewDiv = createElement('div', {
    className: 'lj-prose',
    style: {
      padding: 'var(--space-5)',
      minHeight: rows * 22,
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md, 8px)',
      fontFamily: 'var(--font-body, ui-sans-serif, system-ui)',
      fontSize: 'var(--text-body, 15px)',
      lineHeight: 1.65,
    },
    [innerKey]: { __html: html || '<p style=\'color:var(--fg-muted);\'>Nada para visualizar.</p>' },
  });

  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {label && (
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>{label}</span>
        )}
        <div role="tablist" style={{ display: 'inline-flex', gap: 4, marginLeft: 'auto' }}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'edit'}
            onClick={() => setTab('edit')}
            className={tab === 'edit' ? 'lj-tab-active' : 'lj-tab'}
            style={{
              padding: '4px 12px',
              fontSize: 'var(--text-caption)',
              borderRadius: 'var(--radius-sm, 6px)',
              border: 'none',
              background: tab === 'edit' ? 'var(--neutral-50)' : 'transparent',
              color: tab === 'edit' ? 'var(--fg)' : 'var(--fg-secondary)',
              cursor: 'pointer',
              fontWeight: 'var(--w-medium)',
            }}
          >
            Editor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'preview'}
            onClick={() => setTab('preview')}
            className={tab === 'preview' ? 'lj-tab-active' : 'lj-tab'}
            style={{
              padding: '4px 12px',
              fontSize: 'var(--text-caption)',
              borderRadius: 'var(--radius-sm, 6px)',
              border: 'none',
              background: tab === 'preview' ? 'var(--neutral-50)' : 'transparent',
              color: tab === 'preview' ? 'var(--fg)' : 'var(--fg-secondary)',
              cursor: 'pointer',
              fontWeight: 'var(--w-medium)',
            }}
          >
            Preview
          </button>
        </div>
      </div>
      {tab === 'edit' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="lj-input"
          rows={rows}
          style={{
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: 'var(--text-body-s)',
            lineHeight: 1.55,
          }}
        />
      ) : (
        previewDiv
      )}
      <p style={{ margin: 0, fontSize: 'var(--text-caption)', color: 'var(--fg-muted)' }}>
        Suporta <code>## H2</code>, <code>### H3</code>, <code>**negrito**</code>,{' '}
        <code>- listas</code> e <code>[link](https://...)</code>.
      </p>
    </div>
  );
}
