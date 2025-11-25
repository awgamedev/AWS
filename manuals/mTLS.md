# 6. 📥 CA-Zertifikat (ca.crt) aus der WebApp herunterladen und auf Geräten installieren

Damit ein Gerät (Windows, Android, iOS, macOS) Eurer WebApp vertraut, muss das Root-CA-Zertifikat installiert werden. Die WebApp stellt das CA-Zertifikat zum Download bereit:

**Download-Link:**

    https://<DEINE_WEBAPP_URL>/user/ca/download

Ersetze `<DEINE_WEBAPP_URL>` durch die Adresse Deiner WebApp. (Der genaue Pfad kann je nach Routing abweichen, z.B. `/user/ca/download`)

## Installation des CA-Zertifikats auf verschiedenen Plattformen

### 🪟 Windows

1. Lade die Datei `ca.crt` über die WebApp herunter.
2. Doppelklicke auf die Datei und wähle "Zertifikat installieren".
3. Wähle "Lokaler Computer" und dann "Vertrauenswürdige Stammzertifizierungsstellen" als Speicherort.
4. Bestätige die Installation.

**Alternativ per PowerShell:**

```powershell
Import-Certificate -FilePath "Pfad\zu\ca.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

### 🤖 Android

1. Sende die Datei `ca.crt` an das Gerät (z.B. per E-Mail oder USB).
2. Öffne die Datei auf dem Gerät. Android erkennt das Zertifikat und bietet die Installation an.
3. Wähle "VPN und Apps" als Zertifikatstyp.
4. Bestätige die Installation (ggf. Geräte-PIN eingeben).

### 🍏 iOS (iPhone/iPad)

1. Sende die Datei `ca.crt` an das Gerät (z.B. per E-Mail oder AirDrop).
2. Tippe auf die Datei und wähle "Profil installieren".
3. Gehe zu Einstellungen > Allgemein > Profil und installiere das Profil.
4. Gehe zu Einstellungen > Info > Zertifikatsvertrauenseinstellungen und aktiviere vollständiges Vertrauen für das Zertifikat.

### 🍎 macOS

1. Doppelklicke auf die Datei `ca.crt`.
2. Wähle "System" als Schlüsselbund und bestätige.
3. Öffne das Zertifikat im Schlüsselbund und setze "Beim Verwenden dieses Zertifikats: Immer vertrauen".

---

**Hinweis:** Nach der Installation des CA-Zertifikats vertraut das Gerät allen von dieser CA ausgestellten Zertifikaten – also auch Eurer WebApp und den Client-Zertifikaten für mTLS.

# 🔒 mTLS-Einrichtung für Nginx Reverse Proxy

Diese Anleitung führt Dich durch die Erstellung einer Root Certificate Authority (CA), Server-Zertifikaten und Client-Zertifikaten und die Konfiguration von Nginx zur Erzwingung von Mutual TLS (mTLS), sodass nur autorisierte Geräte Zugriff erhalten.

## 1. 🔑 Root CA und Server-Zertifikate erstellen

Führe die folgenden Schritte auf einem Linux-Rechner aus.

- Ordner erstellen:

```bash
mkdir nTLS
cd nTLS
```

- ca.conf erstellen (Konfiguration für die Root CA): (Der Inhalt ist bereits korrekt für die CA)

```bash
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
```

- Root CA erstellen (Merke Dir das Passwort!):

```bash
# Privaten Schlüssel für die CA erstellen
openssl genrsa -aes256 -out ca.key 4096
# Selbstsigniertes CA-Zertifikat erstellen
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -config ca.conf
```

- server.conf erstellen (Konfiguration für das Server-Zertifikat):

```bash
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
CN = 13.62.49.9
O = DevLab
OU = WebApp
C = US

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
IP.1 = 13.62.49.9
DNS.1 = localhost
# Füge hier alle weiteren IP-Adressen/Hostnamen hinzu, unter denen der Server erreichbar ist.
```

- Server-Zertifikat erstellen und von der CA signieren lassen:

```bash
# Privaten Schlüssel für den Server erstellen
openssl genrsa -out server.key 2048
# Certificate Signing Request (CSR) erstellen
openssl req -new -key server.key -out server.csr -config server.conf
# Server-Zertifikat mit der CA signieren
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256 -extensions req_ext -extfile server.conf
```

## 2. 📱 Client-Zertifikat für ein Gerät erstellen (Wichtig für mTLS)

- client.conf erstellen (Konfiguration für Client-Zertifikate):

```bash
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = v3_usr
distinguished_name = dn

[ dn ]
CN = client_device1
O = DevLab
OU = Device
C = DE

[ v3_usr ]
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
```

-Client-Zertifikat erstellen und von der CA signieren lassen:

```bash
# Privaten Schlüssel für den Client erstellen
openssl genrsa -out client_device1.key 2048
# Certificate Signing Request (CSR) erstellen
openssl req -new -key client_device1.key -out client_device1.csr -config client.conf
# Client-Zertifikat mit der CA signieren
openssl x509 -req -in client_device1.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client_device1.crt -days 365 -sha256 -extensions v3_usr -extfile client.conf
```

- Client-Zertifikat für die Installation exportieren (z.B. als PKCS#12/P12-Datei): Dieser Container enthält den privaten Schlüssel, das Client-Zertifikat und das CA-Zertifikat und wird mit einem Exportpasswort geschützt.

```bash
openssl pkcs12 -export -out client_device1.p12 -inkey client_device1.key -in client_device1.crt -certfile ca.crt
```

- Dieses client_device1.p12 muss nun auf dem Client-Gerät installiert werden (z.B. im Zertifikatsspeicher des Betriebssystems oder Browsers).

## 3. ⚙️ Nginx Konfiguration für mTLS anpassen

Um mTLS zu erzwingen, musst Du die Direktiven ssl_verify_client und ssl_verify_depth in Deinem server-Block hinzufügen bzw. anpassen.

```bash
server {
    listen 443 ssl;

    # TLS/SSL Configuration
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    # mTLS Konfiguration 🚩 NEU HINZUGEFÜGT
    # Gibt an, welche CA-Zertifikate zur Verifizierung von Client-Zertifikaten verwendet werden sollen.
    ssl_client_certificate /etc/nginx/certs/ca.crt;
    # Erzwingt die Client-Zertifikatsverifizierung (nur 'on' oder 'optional' zulassen)
    ssl_verify_client on;
    # Setzt die maximale Tiefe der CA-Kette
    ssl_verify_depth 2;

    # SSL protocols and ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ----------------------------------------------
    # 1. HAUPTANWENDUNG (Node.js App auf Port 4000)
    # Erreichbar über https://localhost/onis/
    # ----------------------------------------------

    # ... Rest Deiner Konfiguration ...
```

## 💡 Wichtige Direktiven für mTLS:

- ssl_client_certificate /etc/nginx/certs/ca.crt;: Teilt Nginx mit, welche Root CA zur Überprüfung des Client-Zertifikats verwendet werden soll.

- ssl_verify_client on;: Erzwingt die Client-Zertifikatsverifizierung. Wenn der Client kein gültiges Zertifikat bereitstellt, wird die Verbindung abgelehnt.

- Alternativ kannst Du optional verwenden, um Client-Zertifikate zu verifizieren, wenn sie präsentiert werden, aber die Verbindung ohne sie zuzulassen (nützlich, um den Verifizierungsstatus z.B. an einen Backend-Service weiterzuleiten).

- Wenn Du optional verwendest und den Zugriff nur für Clients mit Zertifikat gewähren möchtest, kannst Du dies mit if ($ssl_client_verify != SUCCESS) { return 403; } innerhalb des location -Blocks tun (siehe unten).

- ssl_verify_depth 2;: Maximale Kettentiefe für die Verifizierung. 1 wäre ausreichend, da das Client-Zertifikat direkt von der Root CA signiert ist.

# 🎯 Zugriff nur für autorisierte Clients im location-Block (Optional/Erweitert):

Wenn Du ssl_verify_client optional; verwendest, um den Verifizierungsstatus zu protokollieren, aber den Zugriff nur für erfolgreiche Verifizierungen zulassen möchtest, kannst Du Folgendes verwenden:

```bash
# ...

    ssl_verify_client optional; # Nur als Beispiel, wenn nicht global erzwungen wird

    location /onis/ {
        # Verweigere den Zugriff, wenn die Client-Zertifikatsverifizierung NICHT erfolgreich war
        if ($ssl_client_verify != SUCCESS) {
            return 403; # Forbidden
        }

        proxy_pass http://web:4000/onis/;
        # ... weitere proxy-Einstellungen
    }
```

## 4. 🐳 Docker Compose anpassen

Der docker-compose.yml Teil ist korrekt, da er den Ordner nTLS (der ca.crt, server.crt und server.key enthält) als read-only in den Container einbindet:

```bash
nginx:
    image: nginx:latest
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nTLS:/etc/nginx/certs:ro # <-- Hier sind die Zertifikate
```

## 5. 🛠️ Root CA auf Windows-Maschine installieren (Unverändert)

Dies ist nötig, damit der Client Deiner selbst signierten Server-CA vertraut, wenn er sich mit dem Server verbindet (unabhängig von mTLS, aber notwendig für TLS).

- Importieren des Root CA:

```bash
Import-Certificate -FilePath "PATH_TO_DIR\ca.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

- Entfernen des Root CA:

```bash
Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object { $_.Subject -match "DevLab Root CA" } | Format-List Subject, Thumbprint, Issuer
Remove-Item -Path Cert:\LocalMachine\Root\THUMBPRINT_HIER_EINFÜGEN
```

## Weiterreichen der Header an die NodeJS App

Du musst die folgenden Direktiven in Deinem location-Block hinzufügen, der zum Backend proxyt (in Deinem Fall /onis/).

- Füge die proxy_set_header-Direktiven im location-Block für /onis/ hinzu:

```bash
location /onis/ {
  # 1. Verifizierungsstatus (WICHTIG!)
  proxy_set_header X-Ssl-Client-Verify $ssl_client_verify;

  # 2. Common Name (CN) des Clients
  proxy_set_header X-Ssl-Client-CN $ssl_client_s_dn_cn;

  # 3. Vollständiger Subject Distinguished Name (DN)
  proxy_set_header X-Ssl-Client-Subject $ssl_client_s_dn;

  # 4. Zertifikat-Seriennummer (nützlich für Sperrlisten/Logging)
  proxy_set_header X-Ssl-Client-Serial $ssl_client_serial;

  # ...

  proxy_pass http://web:4000/onis/;
```

- Beispielroute in NodeJS:

```bash
// Pseudo-Code in Node.js/Express
app.get('/onis/resource', (req, res) => {
    const verificationStatus = req.headers['x-ssl-client-verify'];
    const clientCN = req.headers['x-ssl-client-cn'];

    // Schritt 1: mTLS-Verifizierung bestätigen
    if (verificationStatus !== 'SUCCESS') {
        return res.status(403).send('Forbidden: mTLS verification failed.');
    }

    // Schritt 2 & 3: Feingranulare Autorisierung basierend auf CN
    if (clientCN === 'client_device1' || clientCN === 'admin_device') {
        // Erlaube den Zugriff
        res.send(`Willkommen, Gerät: ${clientCN}`);
    } else {
        // Verweigere den Zugriff
        res.status(403).send(`Forbidden: Unbekanntes Gerät: ${clientCN}`);
    }
});
```
