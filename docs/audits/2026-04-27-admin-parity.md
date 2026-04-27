# Admin Parity Audit — 2026-04-27

## Resumo executivo

**Score geral: 5.5/10**

### Por tela
- Dashboard 8/10 ✅
- Clientes 6/10 ⚠️
- Tickets 5/10 ⚠️
- Filas 7/10 ⚠️
- Settings 6/10 ⚠️
- Aparência 7/10 ✅
- Wishlist 7/10 ⚠️
- Team ❌ 0/10
- Experiments (ABEditor) ❌ 0/10

### Top 5 gaps críticos
1. **Clientes:** falta CustomerProfile com 4 personas + AI suggestions (sem `/clientes/[email]`).
2. **Tickets:** falta `/tickets/[id]` Detail Drawer com Conversation Timeline + composer.
3. **Team (Settings):** aba presente mas sem render.
4. **ABEditor (Experiments):** página existe sem UI completa.
5. **Wishlist:** "Ver lista →" sem modal/drill-down.

### Top 5 UX bugs
| Tela | Bug | Impacto |
|---|---|---|
| Dashboard | "Exportar" e "+ Novo produto" rotas existem (✅), validar destino certo | Baixo |
| Clientes | Sem busca/filtro RFM, lista plana | Alto |
| Tickets | `/tickets/[id]` página em branco | Alto (fluxo quebrado) |
| Filas/Reviews | Botões Aprovar/Rejeitar sem handler visual | Médio |
| Settings | Aba "Equipe" sem render | Médio |

---

## Patches sugeridos (priorizado)

| # | Arquivo | Fix | Tempo |
|---|---------|-----|-------|
| 1 | `apps/admin/src/app/clientes/[email]/page.tsx` | Criar CustomerProfile com persona card + AI suggestions | 90min |
| 2 | `apps/admin/src/app/tickets/[id]/page.tsx` | TicketDetail drawer (chat, SLA, composer) | 90min |
| 3 | `apps/admin/src/app/settings/page.tsx` | Habilitar render Team tab | 5min |
| 4 | `apps/admin/src/components/settings/team-management.tsx` | Component Team UI completo | 60min |
| 5 | `apps/admin/src/app/aparencia/page.tsx` | Adicionar href "Abrir loja ↗" | 2min |
| 6 | `apps/admin/src/app/settings/page.tsx` | Logo upload + Slogan input | 15min |
| 7 | `apps/admin/src/app/wishlist/page.tsx` | Modal "Ver lista" com clientes aguardando | 20min |
| 8 | `apps/admin/src/app/filas/tabs.tsx` | Handlers Review action buttons | 25min |
| 9 | `apps/admin/src/app/aparencia/page.tsx` | Desktop/Tablet/Mobile preview viewport switcher | 10min |
| 10 | Dashboard | Conversão histórica 30d/60d com sparkline | 30min |

**Avaliação:** admin ~55% aderente. Telas core ok; detalhe (Clientes, Tickets, Team) precisam impl.
