# How to create a root CA and server crt for nginx

- Execure the following commands on a linux machine
- create a folder in the app called nTLS and cd into it

```bash
mkdir nTLS
cd nTLS
```

- create the root ca (save the password securely)

```bash
openssl genrsa -aes256 -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt
```

-create a server.conf and paste the following

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
```

- execute the following 3 commands

```bash
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -config server.conf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256 -extensions req_ext -extfile server.conf
```

## Install the root ca on your windows machine to trust the ca for the server

- move the ca.crt file to your windows machine
- import the root ca on your windows machine (in powershell with admin rights)

```powershell
Import-Certificate -FilePath "PATH_TO_DIR\ca.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

- to remove it enter

```powershell
Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object { $_.Subject -like "*DevLab*" -or $_.Issuer -like "*DevLab*" } | Format-List Subject, Thumbprint, NotAfter
```
