#!/bin/bash
# Setup domain internal hris.hikari.local
# Untuk pengguna Mac/Linux — jalankan dengan: sudo bash setup-hosts.sh

DOMAIN="hris.hikari.local"
HOSTS_FILE="/etc/hosts"

read -p "Masukkan IP server HRIS (contoh: 192.168.1.10): " SERVER_IP

if grep -q "$DOMAIN" "$HOSTS_FILE"; then
    echo "Domain '$DOMAIN' sudah terdaftar. Menimpa..."
    sed -i.bak "/$DOMAIN/d" "$HOSTS_FILE"
fi

echo "$SERVER_IP    $DOMAIN" >> "$HOSTS_FILE"

echo ""
echo "Berhasil! Akses HRIS di: http://$DOMAIN"

# Flush DNS (Mac)
if [[ "$OSTYPE" == "darwin"* ]]; then
    dscacheutil -flushcache && killall -HUP mDNSResponder
fi
