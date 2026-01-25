# Rhema Media System - PRD (Product Requirements Document)

## 📋 Problem Statement Original
Sistema de gerenciamento de mídia para igreja Rhema Brasil de Vitória, incluindo:
- Escalas de pessoas (seg/qua/sex para aulas, diário para conteúdo)
- Confirmação de presença até 1 dia antes
- Sistema de substituição quando alguém não puder ir
- Integração com Google Calendar para notificações no celular
- Cadastro de membros com foto estilo WhatsApp
- Área de links e senhas de acesso
- Aprovação de conteúdo com votação (50%+ para aprovar)
- Dashboard de desenvolvimento e crescimento

## 👥 User Personas

### Líder de Mídia
- Cria e gerencia escalas
- Aprova conteúdos
- Adiciona membros e recursos

### Membro da Equipe
- Confirma presença nas escalas
- Vota em aprovações de conteúdo
- Acessa links e recursos compartilhados

### Operador/Técnico
- Visualiza escalas atribuídas
- Confirma disponibilidade
- Sugere substitutos quando necessário

## 🎯 Core Requirements

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

### Membros
- [x] CRUD completo
- [x] Perfil com foto
- [x] Filtro por departamento
- [x] Funções (operador, editor, câmera, som, social media)

### Aprovação de Conteúdo
- [x] Sistema de votação
- [x] Barra de progresso visual
- [x] Threshold de 50%
- [x] Status (pendente, aprovado, rejeitado)

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

### IA
- [x] Assistente GPT-5.2
- [x] Sugestões de conteúdo

## ✅ What's Been Implemented

### December 2025 - MVP
- **Backend**: FastAPI + MongoDB
  - Endpoints de autenticação
  - CRUD completo para membros, escalas, aprovações, links
  - Sistema de votação
  - Integração OpenAI GPT-5.2
  
- **Frontend**: React + Tailwind + Shadcn/UI
  - Login com Google Auth
  - Dashboard com estatísticas
  - Página de escalas com calendário
  - Página de membros
  - Página de aprovações com votação
  - Página de links e recursos
  - Configurações com assistente IA

## 📊 Prioritized Backlog

### P0 (Crítico)
- [x] Autenticação Google
- [x] CRUD de escalas
- [x] Confirmação de presença
- [x] Dashboard básico

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

## 🚀 Next Action Items

1. **Integração Google Calendar**: Adicionar criação automática de eventos no calendário dos membros quando confirmam presença
2. **Notificações WhatsApp**: Configurar Twilio para enviar lembretes de escala
3. **Upload de Fotos**: Implementar upload de imagens para perfil dos membros
4. **Sistema de Substituição**: Melhorar fluxo de indicação de substituto

## 📝 Notes
- Sistema utiliza Emergent LLM Key para IA
- Autenticação via Emergent Google Auth
- Design seguindo identidade visual Rhema (vermelho/preto/branco)
