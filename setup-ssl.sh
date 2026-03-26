#!/bin/bash
# Script para obter certificado SSL com Let's Encrypt

DOMAIN="midiateam.com.br"
EMAIL="danilo@tomich.com.br"  # Altere para seu email

echo "🔐 Obtendo certificado SSL para $DOMAIN..."

# Criar diretórios necessários
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Obter certificado
docker-compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ Certificado obtido com sucesso!"
    echo ""
    echo "Agora edite frontend/nginx.conf e:"
    echo "1. Comente as linhas do servidor HTTP (location /)"
    echo "2. Descomente o redirect HTTP -> HTTPS"
    echo "3. Descomente o bloco do servidor HTTPS"
    echo ""
    echo "Depois execute:"
    echo "  docker-compose up -d --build frontend"
else
    echo "❌ Erro ao obter certificado"
    echo "Verifique se:"
    echo "1. O domínio $DOMAIN está apontando para este servidor"
    echo "2. As portas 80 e 443 estão abertas no firewall"
fi
