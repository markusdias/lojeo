'use client';

import { useEffect, useState } from 'react';

interface Template {
  id: string;
  name: string;
  body: string;
  createdAt: string;
}

export default function TicketTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state (create / edit)
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets/templates');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTemplates(await res.json() as Template[]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function startCreate() {
    setEditing(null);
    setName('');
    setBody('');
  }

  function startEdit(t: Template) {
    setEditing(t);
    setName(t.name);
    setBody(t.body);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/tickets/templates/${editing.id}` : '/api/tickets/templates';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, body }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setEditing(null);
      setName('');
      setBody('');
      await load();
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, templateName: string) {
    if (!confirm(`Excluir template "${templateName}"?`)) return;
    try {
      const res = await fetch(`/api/tickets/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      alert(String(e));
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Templates de Resposta</h1>
          <p className="body-s mt-1">Respostas pré-definidas para agilizar atendimento</p>
        </div>
        <a href="/tickets" className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>← Voltar aos tickets</a>
      </div>

      {/* Create / Edit form */}
      <div className="lj-card p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>
          {editing ? `Editar: ${editing.name}` : 'Novo template'}
        </h2>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-secondary)' }}>Nome do template</label>
            <input
              className="lj-input w-full"
              placeholder="Ex: Prazo de entrega padrão"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--fg-secondary)' }}>Texto da resposta</label>
            <textarea
              className="lj-input w-full resize-y"
              rows={4}
              placeholder="Olá {nome}, obrigado por entrar em contato..."
              value={body}
              onChange={e => setBody(e.target.value)}
              required
            />
            <p className="caption mt-1">Use {'{nome}'} e {'{pedido}'} como variáveis opcionais</p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="lj-btn-primary"
            >
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar template'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={startCreate}
                className="lj-btn-secondary"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Templates list */}
      {loading ? (
        <p className="body-s">Carregando...</p>
      ) : error ? (
        <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
      ) : templates.length === 0 ? (
        <p className="body-s">Nenhum template criado ainda.</p>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="lj-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{t.name}</p>
                  <p className="body-s mt-1 whitespace-pre-wrap line-clamp-3">{t.body}</p>
                  <p className="caption mt-2">
                    Criado em {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(t)}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.name)}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--error)' }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
