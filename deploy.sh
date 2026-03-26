#!/bin/bash
# ============================================================
# 🚀 Script de Deploy do Mídia Team
# ============================================================
# Opções:
#   --clean    Limpar banco de dados e começar do zero
#   --ssl      Configurar/renovar certificado SSL
#   (nenhuma)  Deploy normal preservando dados
# ============================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CLEAN_DB=false
SETUP_SSL=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --clean) CLEAN_DB=true ;;
        --ssl) SETUP_SSL=true ;;
    esac
done

echo ""
echo -e "${BLUE}========================================================${NC}"
echo -e "${BLUE}🚀 Deploy do Mídia Team${NC}"
echo -e "${BLUE}========================================================${NC}"
echo -e "Data: $(date)"
echo ""

# ============================================================
# PASSO 0: Backup (se banco existir)
# ============================================================
echo -e "${YELLOW}🛡️  PASSO 0: Backup automático pré-deploy${NC}"

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_deploy_$TIMESTAMP.archive"
mkdir -p $BACKUP_DIR

DB_RUNNING=$(docker ps -q -f name=midiateam-db 2>/dev/null || true)

if [ -n "$DB_RUNNING" ]; then
    echo "   Gerando backup do banco de dados..."
    docker exec midiateam-db mongodump --db midiateam_local --archive > "$BACKUP_FILE" 2>/dev/null || true
    
    if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}   ✅ Backup salvo: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
    else
        echo -e "${YELLOW}   ⚠️  Backup vazio ou falhou (banco pode estar limpo)${NC}"
        rm -f "$BACKUP_FILE"
    fi
else
    echo -e "${YELLOW}   ⚠️  MongoDB não está rodando. Pulando backup.${NC}"
fi

# Manter apenas os últimos 10 backups
ls -t $BACKUP_DIR/pre_deploy_*.archive 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

# ============================================================
# PASSO 1: Limpar banco (se --clean)
# ============================================================
if [ "$CLEAN_DB" = true ]; then
    echo ""
    echo -e "${RED}🗑️  PASSO 1: LIMPEZA DO BANCO DE DADOS${NC}"
    echo -e "${RED}   ⚠️  ATENÇÃO: Isso vai APAGAR TODOS os dados!${NC}"
    echo -e "${YELLOW}   Tem certeza? (digite 'sim' para confirmar)${NC}"
    read -r CONFIRM
    if [ "$CONFIRM" = "sim" ]; then
        if [ -n "$DB_RUNNING" ]; then
            echo "   Limpando banco midiateam_prod..."
            docker exec midiateam-db mongo midiateam_prod --eval "db.dropDatabase()" --quiet
            echo -e "${GREEN}   ✅ Banco limpo!${NC}"
        else
            echo "   MongoDB não rodando. Será limpo ao subir."
            # Remover volume para garantir limpeza total
            docker volume rm midiateam_mongodb_data 2>/dev/null || true
            echo -e "${GREEN}   ✅ Volume removido!${NC}"
        fi
    else
        echo "   Limpeza cancelada."
    fi
fi

# ============================================================
# PASSO 2: Rebuild dos containers
# ============================================================
echo ""
echo -e "${YELLOW}📦 PASSO 2: Rebuild dos containers${NC}"

# Parar todos os containers
echo "   Parando containers..."
docker-compose down 2>/dev/null || true

# Remover imagens antigas para forçar rebuild
echo "   Removendo imagens antigas..."
docker rmi midiateam-frontend midiateam-backend 2>/dev/null || true

# Build e start
echo "   Construindo e iniciando containers..."
docker-compose up -d --build

# ============================================================
# PASSO 3: Aguardar e verificar
# ============================================================
echo ""
echo -e "${YELLOW}⏳ PASSO 3: Verificando saúde dos serviços${NC}"

echo "   Aguardando containers iniciarem..."
sleep 10

# Verificar MongoDB
echo "   Verificando MongoDB..."
DB_OK=$(docker exec midiateam-db mongo --eval "db.runCommand({ping:1}).ok" --quiet 2>/dev/null || echo "0")
if [ "$DB_OK" = "1" ]; then
    echo -e "${GREEN}   ✅ MongoDB: OK${NC}"
else
    echo -e "${RED}   ❌ MongoDB: NÃO RESPONDENDO${NC}"
fi

# ============================================================
# PASSO 4: Seed do superadmin (sempre roda - é idempotente)
# ============================================================
echo ""
echo -e "${YELLOW}👤 PASSO 4: Seed do superadmin${NC}"

docker exec midiateam-backend python seed_admin.py 2>/dev/null || {
    echo -e "${RED}   ❌ Erro ao rodar seed. Tentando novamente em 5s...${NC}"
    sleep 5
    docker exec midiateam-backend python seed_admin.py || echo -e "${RED}   ❌ Seed falhou!${NC}"
}

# ============================================================
# PASSO 5: SSL (se --ssl)
# ============================================================
if [ "$SETUP_SSL" = true ]; then
    echo ""
    echo -e "${YELLOW}🔐 PASSO 5: Configurando SSL${NC}"
    
    mkdir -p ./certbot/conf
    mkdir -p ./certbot/www
    
    # Verificar se já existe certificado
    if [ -f "./certbot/conf/live/midiateam.com.br/fullchain.pem" ]; then
        echo "   Certificado já existe. Renovando..."
        docker-compose run --rm certbot renew
    else
        echo "   Obtendo novo certificado..."
        docker-compose run --rm certbot certonly --webroot \
            --webroot-path=/var/www/certbot \
            --email danilo@tomich.com.br \
            --agree-tos \
            --no-eff-email \
            -d midiateam.com.br \
            -d www.midiateam.com.br
    fi
    
    # Recarregar nginx para usar o novo certificado
    docker exec midiateam-frontend nginx -s reload 2>/dev/null || true
    echo -e "${GREEN}   ✅ SSL configurado!${NC}"
fi

# ============================================================
# PASSO 6: Verificação backend
# ============================================================
echo ""
echo -e "${YELLOW}🔍 PASSO 6: Verificação final${NC}"

sleep 3
BACKEND_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs 2>/dev/null || echo "000")
if [ "$BACKEND_OK" = "200" ]; then
    echo -e "${GREEN}   ✅ Backend: OK (HTTP $BACKEND_OK)${NC}"
else
    echo -e "${YELLOW}   ⚠️  Backend: HTTP $BACKEND_OK (pode estar carregando)${NC}"
fi

FRONTEND_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [ "$FRONTEND_OK" = "200" ] || [ "$FRONTEND_OK" = "301" ] || [ "$FRONTEND_OK" = "302" ]; then
    echo -e "${GREEN}   ✅ Frontend: OK (HTTP $FRONTEND_OK)${NC}"
else
    echo -e "${YELLOW}   ⚠️  Frontend: HTTP $FRONTEND_OK (pode estar carregando)${NC}"
fi

# Contagem de dados
USER_COUNT=$(docker exec midiateam-db mongo midiateam_prod --eval "db.registered_users.count()" --quiet 2>/dev/null || echo "?")
MEMBER_COUNT=$(docker exec midiateam-db mongo midiateam_prod --eval "db.members.count()" --quiet 2>/dev/null || echo "?")
ENTITY_COUNT=$(docker exec midiateam-db mongo midiateam_prod --eval "db.entities.count()" --quiet 2>/dev/null || echo "?")
echo -e "${GREEN}   📊 Dados: ${USER_COUNT} usuários, ${MEMBER_COUNT} membros, ${ENTITY_COUNT} orgs${NC}"

# ============================================================
# FINALIZAÇÃO
# ============================================================
echo ""
echo -e "${BLUE}========================================================${NC}"
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${BLUE}========================================================${NC}"
echo ""
echo "📊 Status dos containers:"
docker-compose ps
echo ""
echo -e "🌐 Site:  ${GREEN}https://midiateam.com.br${NC}"
echo -e "📚 API:   ${GREEN}https://midiateam.com.br/api/docs${NC}"
echo ""
echo "📋 Comandos úteis:"
echo "   docker-compose logs -f          # Ver todos os logs"
echo "   docker-compose logs -f backend  # Logs do backend"
echo "   docker-compose logs -f frontend # Logs do frontend"
echo "   bash deploy.sh --ssl            # Configurar/renovar SSL"
echo "   bash deploy.sh --clean          # Deploy com banco limpo"
echo ""
