---
description: Deploy do Mídia Team para produção (NUNCA apagar banco de dados)
---

# Deploy do Mídia Team

## ⚠️ REGRA CRÍTICA: NUNCA impactar o banco de dados em produção!
- **NÃO usar** `--clean` no deploy
- **NÃO rodar** `db.dropDatabase()` ou qualquer operação destrutiva
- **NÃO alterar** estrutura de collections existentes sem migração segura
- O deploy deve ser **apenas** rebuild de containers (frontend + backend), preservando dados

## Informações do Servidor

| Campo | Valor |
|---|---|
| **IP** | `179.48.68.81` |
| **Domínio** | `midiateam.com.br` |
| **SSH User** | `tomich` |
| **SSH Senha** | `Tomich.123` |
| **SSH Porta** | `22002` |
| **Root Senha** | `Tomich@.10` |
| **Root** | `su -` (após conectar como tomich) |
| **Projeto** | `/opt/midiateam` |
| **DB Produção** | `midiateam_prod` (MongoDB 4.4) |

## Superadmin

| Campo | Valor |
|---|---|
| **Email** | `danilo@tomich.com.br` |
| **Senha** | `Aqz.12589.fe` |
| **Role** | `superadmin` |

## Comandos de Deploy (Automatizado com sshpass)

// turbo-all

### 1. Enviar arquivos (do Mac local)
```bash
sshpass -p 'Tomich.123' rsync -avz --exclude='node_modules' --exclude='.git' --exclude='venv' --exclude='build' --exclude='backups' --exclude='test_reports' -e 'ssh -p 22002 -o StrictHostKeyChecking=no' /Users/danilotomich/.gemini/antigravity/scratch/midiateam/ tomich@179.48.68.81:~/midiateam/
```

### 2. Mover arquivos e rodar deploy no servidor
```bash
sshpass -p 'Tomich.123' ssh -p 22002 -o StrictHostKeyChecking=no tomich@179.48.68.81 "echo 'Tomich@.10' | su -c 'cp -r /home/tomich/midiateam/* /opt/midiateam/ 2>/dev/null; cp -r /home/tomich/midiateam/.* /opt/midiateam/ 2>/dev/null; cd /opt/midiateam && bash deploy.sh 2>&1' -"
```

### 3. Se precisar rodar seed do admin (sem apagar dados)
```bash
sshpass -p 'Tomich.123' ssh -p 22002 -o StrictHostKeyChecking=no tomich@179.48.68.81 "echo 'Tomich@.10' | su -c 'docker exec midiateam-backend python seed_admin.py' -"
```

## Portas no Servidor
- **80** — HTTP (redirect para HTTPS)
- **443** — HTTPS (frontend + API proxy)
- **8000** — Backend API (direto)
- **22002** — SSH
- **27017** — MongoDB

## Estrutura Docker
- `midiateam-db` — MongoDB 4.4
- `midiateam-backend` — Python/FastAPI
- `midiateam-frontend` — React + Nginx (HTTPS)
- `midiateam-certbot` — Let's Encrypt SSL

## Volumes (persistentes, NUNCA apagar)
- `midiateam_mongodb_data` — Dados do banco
- `uploads_data` — Uploads dos usuários
