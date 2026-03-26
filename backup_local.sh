#!/bin/bash

LOCAL_BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="local_db_$TIMESTAMP.archive"

echo "========================================================"
echo "🛡️  Iniciando Backup Local"
echo "========================================================"

mkdir -p $LOCAL_BACKUP_DIR

# Verifica se está rodando local (talvez via docker também)
if docker-compose ps -q db >/dev/null; then
    echo "Encontrado container 'db' rodando. Executando mongodump..."
    docker exec midiateam-db mongodump --archive > "$LOCAL_BACKUP_DIR/$BACKUP_FILENAME"
    if [ $? -eq 0 ]; then
        echo "✅ Backup local salvo em: $LOCAL_BACKUP_DIR/$BACKUP_FILENAME"
    else
        echo "❌ Erro ao gerar backup local."
    fi
else
    echo "⚠️  Não foi encontrado container 'midiateam-db' rodando localmente."
fi
