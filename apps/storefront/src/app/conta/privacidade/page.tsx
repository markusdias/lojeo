'use client';

import { useState } from 'react';

export default function PrivacidadePage() {
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  async function handleExport() {
    setExportLoading(true);
    try {
      const res = await fetch('/api/conta');
      if (!res.ok) {
        alert('Erro ao exportar dados');
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDelete() {
    if (confirmText !== 'EXCLUIR_MINHA_CONTA') {
      alert('Digite EXCLUIR_MINHA_CONTA exatamente como mostrado para confirmar.');
      return;
    }
    if (!confirm('Esta ação é IRREVERSÍVEL. Seus dados pessoais serão removidos. Pedidos serão anonimizados (mantidos por 5 anos por obrigação fiscal). Tem certeza?')) {
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/conta', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'EXCLUIR_MINHA_CONTA' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        alert(`Erro: ${data.error ?? res.status}`);
        return;
      }
      alert('Conta excluída. Você será desconectado.');
      window.location.href = '/';
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 32 }}>Privacidade dos meus dados</h1>

      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.5 }}>
        De acordo com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018),
        você tem direito de acessar, exportar e excluir seus dados pessoais a qualquer momento.
      </p>

      {/* Export */}
      <section style={{ background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Exportar meus dados</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          Baixe uma cópia dos seus dados pessoais em formato JSON: cadastro, pedidos,
          endereços, lista de desejos, fotos enviadas e avaliações.
        </p>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: exportLoading ? 'not-allowed' : 'pointer', opacity: exportLoading ? 0.6 : 1 }}
        >
          {exportLoading ? 'Exportando...' : 'Baixar dados (JSON)'}
        </button>
      </section>

      {/* Delete */}
      <section style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: '#991B1B' }}>Excluir minha conta</h2>
        <p style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 8, lineHeight: 1.5 }}>
          Ao excluir sua conta:
        </p>
        <ul style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 16, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>Seu cadastro, endereços, lista de desejos, fotos e avaliações serão <strong>removidos</strong></li>
          <li>Seus pedidos serão <strong>anonimizados</strong> e mantidos por 5 anos (obrigação fiscal NF-e)</li>
          <li>Eventos de comportamento e dados de sessão serão <strong>deletados</strong></li>
          <li>Esta ação é <strong>irreversível</strong></li>
        </ul>
        <p style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 8 }}>
          Para confirmar, digite <code style={{ background: 'white', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace' }}>EXCLUIR_MINHA_CONTA</code> abaixo:
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="EXCLUIR_MINHA_CONTA"
          style={{ width: '100%', maxWidth: 320, border: '1px solid #FCA5A5', borderRadius: 4, padding: 8, fontSize: 13, marginBottom: 12, fontFamily: 'monospace' }}
        />
        <br />
        <button
          onClick={handleDelete}
          disabled={deleteLoading || confirmText !== 'EXCLUIR_MINHA_CONTA'}
          style={{
            background: confirmText === 'EXCLUIR_MINHA_CONTA' ? 'var(--danger, #B91C1C)' : 'var(--text-muted, #9CA3AF)',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            cursor: confirmText === 'EXCLUIR_MINHA_CONTA' && !deleteLoading ? 'pointer' : 'not-allowed',
          }}
        >
          {deleteLoading ? 'Excluindo...' : 'Excluir conta permanentemente'}
        </button>
      </section>
    </div>
  );
}
