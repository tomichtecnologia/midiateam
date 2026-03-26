#!/bin/bash

# Configurações
SERVER_IP="179.48.68.81"
SSH_PORT="22002"
SSH_USER="tomich"
REMOTE_PROJECT_DIR="/home/tomich/midiateam"
LOCAL_BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="midiateam_db_$TIMESTAMP.archive"

echo "========================================================"
echo "🛡️  Iniciando Backup do Mídia Team"
echo "========================================================"
echo "Data: $(date)"

# Criar diretório local de backups se não existir
mkdir -p $LOCAL_BACKUP_DIR

echo ""
echo "⏳ 1. Gerando dump do MongoDB no servidor..."
# Executa o mongodump dentro do container e salva o arquivo no host
ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "cd $REMOTE_PROJECT_DIR && \
    docker exec midiateam-db sh -c 'mongodump --db midiateam_prod --archive' > $BACKUP_FILENAME"

if [ $? -eq 0 ]; then
    echo "✅ Dump gerado com sucesso no servidor: $BACKUP_FILENAME"
else
    echo "❌ Erro ao gerar dump no servidor."
    exit 1
fi

echo ""
echo "⏳ 2. Baixando backup para o computador local..."
scp -P $SSH_PORT $SSH_USER@$SERVER_IP:$REMOTE_PROJECT_DIR/$BACKUP_FILENAME $LOCAL_BACKUP_DIR/

if [ $? -eq 0 ]; then
    echo "✅ Backup baixado com sucesso para: $LOCAL_BACKUP_DIR/$BACKUP_FILENAME"
    
    # Limpar backup remoto para economizar espaço
    echo ""
    echo "🧹 3. Limpando arquivo temporário no servidor..."
    ssh -p $SSH_PORT $SSH_USER@$SERVER_IP "rm $REMOTE_PROJECT_DIR/$BACKUP_FILENAME"
    echo "✅ Arquivo remoto removido."
    
    echo ""
    echo "🎉 Backup concluído com sucesso!"
    echo "📁 Local: $(pwd)/backups/$BACKUP_FILENAME"
else
    echo "❌ Erro ao baixar o backup."
    exit 1
fi
