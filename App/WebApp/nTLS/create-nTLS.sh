#!/bin/bash

# --- Konfiguration ---
CA_PASSWORD="MySecureCAPassword123!" # <--- ÄNDERE DIESES PASSWORT!
SERVER_IP="13.62.49.9"              # <--- ÄNDERE DIESE IP/HOSTNAME
CLIENT_NAME="client_device1"        # Name des zu erstellenden Clients
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


# --- 🚩 KORREKTUREN FÜR CLIENT-ZERTIFIKAT STARTEN 🚩 ---

## 2. 📱 Client-Zertifikat erstellen

echo -e "\n## 2.1 Erstelle client.conf (Konfig für den CSR)"
# Diese Datei enthält nur DN, da der CSR die V3-Erweiterungen noch nicht kennen darf.
cat <<EOF > client.conf
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn

[ dn ]
CN = $CLIENT_NAME
O = DevLab
OU = Device
C = DE
EOF

echo -e "\n## 2.1b Erstelle client_ext.conf (V3 Erweiterungen für die Signierung)"
# Diese Datei wird nur beim openssl x509 (Signier-)Befehl verwendet.
cat <<EOF > client_ext.conf
[ v3_usr ]
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF


echo -e "\n## 2.2 Erstelle Client-Zertifikat"
# 1. Privaten Schlüssel für den Client erstellen
openssl genrsa -out $CLIENT_NAME.key 2048

# 2. Certificate Signing Request (CSR) erstellen (verwendet nur client.conf)
openssl req -new -key $CLIENT_NAME.key -out $CLIENT_NAME.csr -config client.conf

# 3. Client-Zertifikat mit der CA signieren (wendet client_ext.conf an)
openssl x509 -req -in $CLIENT_NAME.csr -CA ca.crt -CAkey ca.key -passin pass:$CA_PASSWORD -CAcreateserial -out $CLIENT_NAME.crt -days $DAYS_CERT -sha256 -extensions v3_usr -extfile client_ext.conf

# --- 🚩 KORREKTUREN FÜR CLIENT-ZERTIFIKAT BEENDEN 🚩 ---

echo -e "\n## 2.3 Exportiere Client-Zertifikat (PKCS#12/P12)"
echo "Bitte gib ein **Export-Passwort** für $CLIENT_NAME.p12 ein (Wird für die Installation auf dem Client-Gerät benötigt):"
openssl pkcs12 -export -out $CLIENT_NAME.p12 -inkey $CLIENT_NAME.key -in $CLIENT_NAME.crt -certfile ca.crt

echo -e "\n--- mTLS-Setup abgeschlossen ---"
echo "✅ Kopiere ca.crt, server.crt, server.key in das Nginx-Volume."
echo "✅ Installiere $CLIENT_NAME.p12 auf dem Client-Gerät."