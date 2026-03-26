# Plano de Implementação - Novas Features MídiaTeam

## Feature 1: Quadro de Regras (Rules Board)

### Descrição
Card na Dashboard mostrando regras/diretrizes da organização. Cada admin de cada organização pode definir suas próprias regras.

### Backend (server.py)
1. **Model `EntityRules`** - armazenado na collection `entity_rules`
   - `entity_id`: str (FK para a organização)
   - `rules`: List[dict] com `{title, content, order, active}`
   - `updated_by`: str (user_id do admin que editou)
   - `updated_at`: datetime

2. **Endpoints**:
   - `GET /api/rules` - retorna as regras da organização atual
   - `PUT /api/rules` - admin atualiza as regras da organização

### Frontend
1. **Dashboard.jsx** - Novo card "📋 Regras da Organização" com:
   - Lista de regras numeradas
   - Botão "Editar" visível apenas para admins
   - Dialog de edição com campos para adicionar/remover/reordenar regras
   - Texto em formato markdown simples (negrito, etc.)

---

## Feature 2: Anotações Pessoais no Calendário

### Descrição
Cada usuário pode adicionar anotações pessoais em datas do calendário existente. Um indicador visual aparece nos dias com anotações.

### Backend (server.py)
1. **Model `CalendarNote`** - collection `calendar_notes`
   - `note_id`: str (auto-gerado)
   - `user_id`: str (dono da anotação)
   - `entity_id`: str (organização)
   - `date`: str (YYYY-MM-DD)
   - `title`: str
   - `content`: str (texto da anotação)
   - `color`: str (cor do marcador, opcional)
   - `created_at`: datetime

2. **Endpoints**:
   - `GET /api/calendar-notes?start_date=...&end_date=...` - retorna notas do user no período
   - `POST /api/calendar-notes` - cria nota
   - `PUT /api/calendar-notes/{note_id}` - edita nota
   - `DELETE /api/calendar-notes/{note_id}` - exclui nota

### Frontend (SchedulesPage.jsx)
1. Indicador visual no calendário para dias com anotações (dot colorido)
2. Ao clicar no dia, mostrar anotações junto com as escalas
3. Botão "📝 Adicionar Anotação" 
4. Dialog para criar/editar anotação com campos: título, conteúdo, cor
5. Cada anotação com botões de editar/excluir
