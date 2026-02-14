# Mídia Team - PRD (Product Requirements Document)

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
- **NOVO**: Aprova cadastros de novos usuários

### Membro da Equipe
- Confirma presença nas escalas
- Vota em aprovações de conteúdo (se habilitado)
- Acessa links e recursos compartilhados

### Operador/Técnico
- Visualiza escalas atribuídas
- Confirma disponibilidade
- Sugere substitutos quando necessário

## Core Requirements

### Autenticação (ATUALIZADO - Fev 2026)
- [x] ~~Login via Google (Emergent Google Auth)~~ REMOVIDO
- [x] **NOVO**: Cadastro com email/senha (aguarda aprovação do admin)
- [x] **NOVO**: Primeiro usuário é auto-aprovado como admin
- [x] **NOVO**: Login via email e senha
- [x] **NOVO**: Recuperação de senha ("Esqueci minha senha")
- [x] **NOVO**: Admin pode aprovar/rejeitar cadastros pendentes
- [x] Sessões persistentes (7 dias)
- [x] Proteção de rotas

### Branding (NOVO - Fev 2026)
- [x] Nome alterado para "Mídia Team"
- [x] Rodapé "Desenvolvido por Tomich Tecnologia"
- [x] Logotipo com ícone Play

### Gestão de Escalas
- [x] Criação de escalas (aulas e conteúdo)
- [x] Atribuição de membros
- [x] Confirmação de presença
- [x] Deadline de confirmação (1 dia antes)
- [x] Calendário visual
- [x] Sistema de recorrência (diário, semanal, mensal)
- [x] Separação por tipos
- [x] Funções/Responsabilidades delegadas a membros
- [x] Sistema de Substituição/Troca de escalas
- [x] Seção "Minhas Escalas" no Dashboard
- [x] Badges: HOJE, AMANHÃ, Pendente, Confirmado
- [x] Solicitações de troca com motivo
- [x] Aceitação de troca por outros membros

### Membros
- [x] CRUD completo
- [x] Perfil com foto
- [x] Filtro por departamento
- [x] Funções (operador, editor, câmera, som, social media)
- [x] Permissão is_admin
- [x] Permissão can_vote
- [x] **NOVO**: Seção de cadastros pendentes (admin)

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
- [x] Criador pode responder aos motivos de rejeição
- [x] Criador pode solicitar reavaliação do conteúdo
- [x] Histórico de revisões anteriores visível

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

### Fevereiro 2026 - Sistema de Autenticação Personalizado
- **Remoção do Google Auth**: Login com Google completamente removido
- **Cadastro com Aprovação**: Novos usuários preenchem nome, email, telefone, senha
- **Auto-aprovação do Primeiro Usuário**: Primeiro cadastro vira admin automaticamente
- **Fluxo de Aprovação**: Admin vê "Cadastros Pendentes" na página de Membros
- **Login Email/Senha**: Formulário de login modernizado
- **Recuperação de Senha**: Fluxo de "Esqueci minha senha" com token
- **Branding Mídia Team**: Nome alterado em toda a aplicação
- **Rodapé Tomich Tecnologia**: Adicionado no sidebar
- **Testes**: 100% de sucesso em backend (19/19) e frontend

### Fevereiro 2026 - Multi-Entidade e Admin
- Sistema Multi-Entidade completo
- Controles de Administrador (estornar votos, excluir aprovações)
- Testes: 100% de sucesso

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

### P0 (Crítico) - ✅ CONCLUÍDO
- [x] Autenticação personalizada (email/senha)
- [x] Cadastro com aprovação de admin
- [x] Branding "Mídia Team"
- [x] Rodapé "Tomich Tecnologia"

### P1 (Alta Prioridade)
- [ ] Integração completa Google Calendar (criar eventos)
- [ ] Notificações WhatsApp via Twilio
- [ ] Upload de imagens para membros
- [ ] Exclusão de escalas pelo admin (individual ou recorrentes)

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

1. **Exclusão de Escalas**: Implementar DELETE /api/schedules/{id} com opção delete_recurring
2. **Integração Google Calendar**: Adicionar criação automática de eventos
3. **Notificações WhatsApp**: Configurar Twilio para lembretes
4. **Upload de Fotos**: Implementar upload de imagens para perfil

## Arquitetura Técnica

```
/app/
├── backend/
│   ├── server.py        # FastAPI monólito (precisa refatoração)
│   ├── .env             # MONGO_URL, EMERGENT_LLM_KEY
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js           # Rotas públicas e privadas
│   │   ├── pages/
│   │   │   ├── HomePage.jsx        # NOVO - Página pública
│   │   │   ├── LoginPage.jsx       # ATUALIZADO - Email/senha
│   │   │   ├── RegisterPage.jsx    # NOVO - Cadastro
│   │   │   ├── ForgotPasswordPage.jsx  # NOVO
│   │   │   ├── ResetPasswordPage.jsx   # NOVO
│   │   │   ├── Dashboard.jsx
│   │   │   ├── MembersPage.jsx     # ATUALIZADO - Cadastros pendentes
│   │   │   └── ...
│   │   └── components/
│   │       └── SidebarLayout.jsx   # ATUALIZADO - Branding
│   └── .env             # REACT_APP_BACKEND_URL
└── memory/
    └── PRD.md
```

## Notes
- Sistema utiliza Emergent LLM Key para IA
- **Autenticação via JWT personalizado (Google Auth removido)**
- Design com tema vermelho/branco
- Primeiro usuário sempre é admin

## Credenciais de Teste
- **Admin**: admin@teste.com / senha123
