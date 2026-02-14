# Tomich Gestão de Mídia - PRD (Product Requirements Document)

## Problema Original
Sistema de gerenciamento de mídia para igreja, incluindo:
- Escalas de pessoas (seg/qua/sex para aulas, diário para conteúdo)
- Confirmação de presença até 1 dia antes
- Sistema de substituição quando alguém não puder ir
- Integração com Google Calendar para notificações no celular
- Cadastro de membros com foto estilo WhatsApp
- Área de links e senhas de acesso
- Aprovação de conteúdo com votação (50%+ para aprovar)
- Dashboard de desenvolvimento e crescimento
- Sistema multi-entidade (multi-tenant)
- Controles de administrador avançados

## User Personas

### Líder de Mídia / Admin
- Cria e gerencia escalas
- Aprova conteúdos
- Adiciona membros e recursos
- Gerencia permissões de votação
- Pode estornar votos e excluir aprovações

### Membro da Equipe
- Confirma presença nas escalas
- Vota em aprovações de conteúdo (se habilitado)
- Acessa links e recursos compartilhados

### Operador/Técnico
- Visualiza escalas atribuídas
- Confirma disponibilidade
- Sugere substitutos quando necessário

## Core Requirements

### Autenticação
- [x] Login via Google (Emergent Google Auth)
- [x] Sessões persistentes (7 dias)
- [x] Proteção de rotas

### Gestão de Escalas
- [x] Criação de escalas (aulas e conteúdo)
- [x] Atribuição de membros
- [x] Confirmação de presença
- [x] Deadline de confirmação (1 dia antes)
- [x] Calendário visual
- [x] Sistema de recorrência (diário, semanal, mensal)
- [x] Separação por tipos

### Membros
- [x] CRUD completo
- [x] Perfil com foto
- [x] Filtro por departamento
- [x] Funções (operador, editor, câmera, som, social media)
- [x] Permissão is_admin
- [x] Permissão can_vote

### Aprovação de Conteúdo
- [x] Sistema de votação
- [x] Barra de progresso visual
- [x] Threshold de 50%
- [x] Status (pendente, aprovado, rejeitado)
- [x] Contagem apenas de votantes habilitados
- [x] Admin: Estornar voto individual
- [x] Admin: Reiniciar votação
- [x] Admin: Excluir aprovação
- [x] Motivo obrigatório para rejeição com histórico

### Sistema Multi-Entidade
- [x] Campo entity_id em todos os modelos
- [x] Isolamento de dados por entidade
- [x] Entidade padrão criada automaticamente
- [x] Usuários podem pertencer a múltiplas entidades

### Links & Recursos
- [x] CRUD de links
- [x] Categorização
- [x] Armazenamento de senhas
- [x] Cópia rápida

### Dashboard
- [x] Estatísticas gerais
- [x] Próximas escalas
- [x] Aprovações pendentes
- [x] Indicadores de crescimento

### Gamificação
- [x] Sistema de pontos
- [x] 15 medalhas conquistáveis
- [x] 10 níveis (Iniciante → Supremo)
- [x] Ranking/Leaderboard da equipe
- [x] Página dedicada /gamification

### IA
- [x] Assistente GPT-5.2
- [x] Sugestões de conteúdo

## What's Been Implemented

### Fevereiro 2026 - Multi-Entidade e Admin
- **Sistema Multi-Entidade completo**:
  - Campo entity_id em membros, escalas, aprovações, links
  - Isolamento de dados por entidade
  - Endpoints para gerenciar entidades
  - Troca de entidade ativa

- **Controles de Administrador**:
  - Permissão is_admin em membros
  - Permissão can_vote para votação
  - Estornar voto individual de aprovação
  - Reiniciar toda a votação
  - Excluir aprovação
  - UI com menu dropdown para admin
  - Badges visuais (Admin, Pode Votar, Modo Admin)

- **Testes**: 100% de sucesso em backend e frontend

### Janeiro 2026 - Gamificação
- Sistema de pontos por interação
- 15 medalhas conquistáveis
- 10 níveis
- Ranking/Leaderboard

### Dezembro 2025 - MVP
- Backend: FastAPI + MongoDB
- Frontend: React + Tailwind + Shadcn/UI
- CRUD completo para todas as entidades
- Integração OpenAI GPT-5.2

## Prioritized Backlog

### P0 (Crítico) - CONCLUÍDO
- [x] Autenticação Google
- [x] CRUD de escalas
- [x] Confirmação de presença
- [x] Dashboard básico
- [x] Sistema Multi-Entidade
- [x] Controles de Admin

### P1 (Alta Prioridade)
- [ ] Integração completa Google Calendar (criar eventos)
- [ ] Notificações WhatsApp via Twilio
- [ ] Upload de imagens para membros
- [ ] Sistema de substituição melhorado

### P2 (Média Prioridade)
- [ ] Relatórios de crescimento
- [ ] Exportação de dados
- [ ] Histórico de escalas
- [ ] Notificações push

### P3 (Baixa Prioridade)
- [ ] Temas personalizados
- [ ] Integração com outras plataformas
- [ ] App mobile nativo

## Next Action Items

1. **Integração Google Calendar**: Adicionar criação automática de eventos
2. **Notificações WhatsApp**: Configurar Twilio para lembretes
3. **Upload de Fotos**: Implementar upload de imagens para perfil
4. **Sistema de Substituição**: Melhorar fluxo de indicação de substituto

## Arquitetura Técnica

```
/app/
├── backend/
│   ├── server.py        # FastAPI monólito
│   ├── .env             # MONGO_URL, EMERGENT_LLM_KEY
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/       # Dashboard, Members, Schedules, Approvals, etc.
│   │   └── components/  # Shadcn UI components
│   └── .env             # REACT_APP_BACKEND_URL
└── memory/
    └── PRD.md
```

## Notes
- Sistema utiliza Emergent LLM Key para IA
- Autenticação via Emergent Google Auth
- Design com tema vermelho/branco
