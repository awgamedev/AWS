#!/bin/bash

# --- Konfiguration ---
CA_PASSWORD="MySecureCAPassword123!" # <--- ÄNDERE DIESES PASSWORT!
SERVER_IP="85.215.69.205"              # <--- ÄNDERE DIESE IP/HOSTNAME
DAYS_CA=3650
DAYS_CERT=365
# ---------------------

echo "--- Starte mTLS-Zertifikatserstellung ---"

# Bereinigung alter Dateien (optional, aber hilfreich bei Wiederholung)
rm -f *.key *.crt *.csr *.srl *.conf *.p12

## 1. 🔑 Root CA und Server-Zertifikate erstellen

echo -e "\n## 1.1 Erstelle ca.conf (Root CA Konfiguration)"
cat <<EOF > ca.conf
[ req ]
default_bits       = 4096
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_ca

[ dn ]
CN = DevLab Root CA
O = DevLab
OU = Development
C = DE
L = Munich
ST = Bavaria

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical,CA:true
keyUsage = critical,digitalSignature,cRLSign,keyCertSign
EOF

echo -e "\n## 1.2 Erstelle Root CA"
# Privaten Schlüssel für die CA erstellen
openssl genrsa -aes256 -passout pass:$CA_PASSWORD -out ca.key 4096
# Selbstsigniertes CA-Zertifikat erstellen
openssl req -x509 -new -nodes -key ca.key -passin pass:$CA_PASSWORD -sha256 -days $DAYS_CA -out ca.crt -config ca.conf

echo -e "\n## 1.3 Erstelle server.conf (Server-Zertifikat Konfiguration)"
cat <<EOF > server.conf
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
CN = $SERVER_IP
O = DevLab
OU = WebApp
C = US

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
IP.1 = $SERVER_IP
DNS.1 = localhost
# Füge hier alle weiteren IP-Adressen/Hostnamen hinzu, unter denen der Server erreichbar ist.
EOF

echo -e "\n## 1.4 Erstelle Server-Zertifikat"
# Privaten Schlüssel für den Server erstellen
openssl genrsa -out server.key 2048
# Certificate Signing Request (CSR) erstellen
openssl req -new -key server.key -out server.csr -config server.conf
# Server-Zertifikat mit der CA signieren
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -passin pass:$CA_PASSWORD -CAcreateserial -out server.crt -days $DAYS_CERT -sha256 -extensions req_ext -extfile server.conf

echo -e "\n--- mTLS-Setup abgeschlossen ---"
echo "✅ Kopiere ca.crt, server.crt, server.key in das Nginx-Volume."

# Löscht alle CSR-, temporären Konfigurations- und Seriennummer-Dateien
rm -f *.csr client.conf ca.conf client_ext.conf server.conf *.srl