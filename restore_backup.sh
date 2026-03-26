#!/bin/bash
# ============================================================
# 🔄 Restaurar Backup do MongoDB - Mídia Team
# ============================================================
# Uso: ./restore_backup.sh [arquivo_backup]
# Exemplo: ./restore_backup.sh ./backups/pre_deploy_20260216_100000.archive
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}Backups disponíveis:${NC}"
    echo ""
    ls -lht ./backups/*.archive 2>/dev/null || echo "Nenhum backup encontrado em ./backups/"
    echo ""
    echo -e "Uso: ${GREEN}./restore_backup.sh ./backups/ARQUIVO.archive${NC}"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Arquivo não encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo ""
echo -e "${RED}========================================================${NC}"
echo -e "${RED}⚠️  ATENÇÃO: Restauração de Backup${NC}"
echo -e "${RED}========================================================${NC}"
echo ""
echo -e "Arquivo: ${YELLOW}$BACKUP_FILE${NC} ($BACKUP_SIZE)"
echo ""
echo -e "${RED}Isso vai SUBSTITUIR todos os dados atuais do banco!"
echo -e "Tem certeza que deseja continuar? (digite 'SIM' para confirmar)${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "SIM" ]; then
    echo "Restauração cancelada."
    exit 0
fi

# Fazer backup do estado ATUAL antes de restaurar
echo ""
echo -e "${YELLOW}1. Salvando backup do estado atual antes da restauração...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SAFETY_BACKUP="./backups/pre_restore_$TIMESTAMP.archive"
docker exec midiateam-db mongodump --db midiateam_prod --archive > "$SAFETY_BACKUP" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Backup de segurança salvo: $SAFETY_BACKUP${NC}"
else
    echo -e "${RED}   ❌ Erro ao salvar backup de segurança. Cancelando.${NC}"
    exit 1
fi

# Restaurar
echo ""
echo -e "${YELLOW}2. Restaurando banco de dados...${NC}"
docker exec -i midiateam-db mongorestore --archive --drop < "$BACKUP_FILE" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Banco de dados restaurado com sucesso!${NC}"
    
    # Verificar dados
    USER_COUNT=$(docker exec midiateam-db mongo midiateam_prod --eval "db.registered_users.count()" --quiet 2>/dev/null || echo "?")
    MEMBER_COUNT=$(docker exec midiateam-db mongo midiateam_prod --eval "db.members.count()" --quiet 2>/dev/null || echo "?")
    echo -e "${GREEN}   📊 Dados restaurados: ${USER_COUNT} usuários, ${MEMBER_COUNT} membros${NC}"
else
    echo -e "${RED}   ❌ Erro na restauração!${NC}"
    echo -e "${YELLOW}   O backup de segurança está em: $SAFETY_BACKUP${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Restauração concluída!${NC}"
echo -e "${YELLOW}💡 Caso precise reverter, use: ./restore_backup.sh $SAFETY_BACKUP${NC}"
echo ""
