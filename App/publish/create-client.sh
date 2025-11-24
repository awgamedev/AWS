#!/bin/bash

# --- Konfiguration ---
# ⚠️ WICHTIG: Passe diese Werte an ⚠️

# 1. Passwort der Root CA (Wird zum Signieren benötigt)
CA_PASSWORD="MySecureCAPassword123!" 

# 2. Name des neuen Client-Geräts (Wird als Common Name (CN) verwendet)
NEW_CLIENT_NAME="client_device3" # <--- ÄNDERE DIESEN NAMEN VOR JEDER AUSFÜHRUNG!

# 3. Pfad zum Ordner, in dem sich ca.key und ca.crt befinden
# Das Skript geht davon aus, dass ca.key und ca.crt im aktuellen Ordner sind.
CA_KEY="ca.key"
CA_CRT="ca.crt"

# 4. Gültigkeitsdauer des neuen Client-Zertifikats
DAYS_CERT=365 
# ---------------------

# Sicherstellen, dass die CA-Dateien existieren
if [ ! -f "$CA_KEY" ] || [ ! -f "$CA_CRT" ]; then
    echo "❌ Fehler: Die Root CA Dateien ($CA_KEY und $CA_CRT) wurden nicht gefunden."
    echo "Bitte stelle sicher, dass sie im aktuellen Verzeichnis liegen oder passe die Pfade an."
    exit 1
fi

echo "--- Starte Generierung für neuen Client: $NEW_CLIENT_NAME ---"
echo "--- Signiere mit CA: $CA_CRT ---"

# Temporäre Konfigurationsdateien
CLIENT_CONF="client_${NEW_CLIENT_NAME}.conf"
CLIENT_EXT="client_${NEW_CLIENT_NAME}_ext.conf"

# 1. Konfiguration für den CSR (Common Name, Organisation etc.)
echo -e "\n## 1. Erstelle $CLIENT_CONF (CSR Konfiguration)"
cat <<EOF > $CLIENT_CONF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn

[ dn ]
CN = $NEW_CLIENT_NAME
O = DevLab
OU = Device
C = DE
EOF

# 2. Konfiguration für die Erweiterungen (Key Usage, Client Auth)
echo -e "\n## 2. Erstelle $CLIENT_EXT (V3 Erweiterungen für Signierung)"
cat <<EOF > $CLIENT_EXT
[ v3_usr ]
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF


# 3. Erstellung der Client-Dateien
echo -e "\n## 3. Erstelle Schlüssel, CSR und signiere Zertifikat"
# Generiere privaten Schlüssel
openssl genrsa -out ${NEW_CLIENT_NAME}.key 2048

# Generiere Certificate Signing Request (CSR)
openssl req -new -key ${NEW_CLIENT_NAME}.key -out ${NEW_CLIENT_NAME}.csr -config $CLIENT_CONF

# Signiere CSR mit der Root CA, um das endgültige Zertifikat zu erhalten
openssl x509 -req -in ${NEW_CLIENT_NAME}.csr -CA $CA_CRT -CAkey $CA_KEY -passin pass:$CA_PASSWORD -CAcreateserial -out ${NEW_CLIENT_NAME}.crt -days $DAYS_CERT -sha256 -extensions v3_usr -extfile $CLIENT_EXT

# 4. Exportiere für Client-Installation (PKCS#12/P12)
echo -e "\n## 4. Exportiere Client-Zertifikat (PKCS#12/P12)"
echo "Bitte gib ein **Export-Passwort** für ${NEW_CLIENT_NAME}.p12 ein:"
openssl pkcs12 -export -out ${NEW_CLIENT_NAME}.p12 -inkey ${NEW_CLIENT_NAME}.key -in ${NEW_CLIENT_NAME}.crt -certfile $CA_CRT

# 5. Bereinigung
echo -e "\n## 5. Bereinigung temporärer Dateien"
rm -f ${NEW_CLIENT_NAME}.csr $CLIENT_CONF $CLIENT_EXT

echo -e "\n--- Generierung für $NEW_CLIENT_NAME abgeschlossen ---"
echo "Wichtige Dateien: ${NEW_CLIENT_NAME}.p12 (zur Installation), ${NEW_CLIENT_NAME}.key, ${NEW_CLIENT_NAME}.crt"

# wenn du nur die .p12-Datei für den Client verwenden willst.
rm -f ${NEW_CLIENT_NAME}.key ${NEW_CLIENT_NAME}.crt