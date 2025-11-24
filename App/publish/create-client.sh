#!/bin/bash

###############################################################################
# Client Certificate Generation Script (mTLS Auto-Login Compatible)
#
# This script creates a client certificate whose DN (and optional SAN/email)
# can be matched by the mTLS auto-login middleware (`mtlsAutoLogin.js`).
#
# Mapping to middleware:
#   - Middleware reads DN attribute (default: CN) or EMAILADDRESS if configured.
#   - Optionally includes email fallback. Provide email here to embed in DN + SAN.
#   - Extended Key Usage includes clientAuth.
#
# Usage examples:
#   bash ./create-client.sh -n alice               # CN=alice
#   bash ./create-client.sh -n alice -e alice@org.local  # CN=alice + emailAddress + SAN email
#   bash ./create-client.sh -n bob -e bob@org.local -r admin  # OU=admin for informational role tag
#
# Recommended middleware env mapping:
#   MTLS_AUTO_LOGIN_ENABLED=true
#   MTLS_DN_ATTRIBUTE=CN            (or EMAILADDRESS if you want email as primary)
#   MTLS_MATCH_FIELD=username       (or email)
#   MTLS_FALLBACK_TO_EMAIL=true     (if email provided)
###############################################################################

###############################################################################
# Shell / portability guards
###############################################################################
# If user invokes via 'sh create-client.sh' force re-exec under bash.
if [ -z "${BASH_VERSION:-}" ]; then
    echo "[WARN] Not running under bash. Re-executing with bash..." >&2
    exec /bin/bash "$0" "$@"
fi

# Strict mode (pipefail only if supported)
set -eu
if set -o 2>/dev/null | grep -q pipefail; then
    set -o pipefail
fi

# --- Defaults (override via flags) -------------------------------------------------
CA_PASSWORD="MySecureCAPassword123!"      # or export CA_PASSWORD before running
CLIENT_NAME="client_device"              # will append random suffix if not overridden
CLIENT_EMAIL=""                          # optional email for EMAILADDRESS + SAN
CLIENT_ROLE="Device"                     # stored in OU for informational purposes
COUNTRY="DE"
ORG="DevLab"
DAYS_CERT=365
KEY_BITS=2048
KEEP_KEY_AND_CERT="false"                # set to true to keep .key/.crt (recommended server-side)
OUT_DIR="."                              # output directory

CA_KEY="ca.key"
CA_CRT="ca.crt"

# --- Parse flags ------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        -n|--name) CLIENT_NAME="$2"; shift 2;;
        -e|--email) CLIENT_EMAIL="$2"; shift 2;;
        -r|--role) CLIENT_ROLE="$2"; shift 2;;
        -c|--country) COUNTRY="$2"; shift 2;;
        -o|--org) ORG="$2"; shift 2;;
        -d|--days) DAYS_CERT="$2"; shift 2;;
        -k|--keep) KEEP_KEY_AND_CERT="true"; shift 1;;
        -O|--out) OUT_DIR="$2"; shift 2;;
        -h|--help)
            echo "Usage: $0 -n <name> [-e <email>] [-r <role>] [-k] [-O <out_dir>]";
            exit 0;;
        *)
            echo "Unknown option: $1"; exit 1;;
    esac
done

if [[ -z "${CLIENT_NAME}" ]]; then
    echo "❌ Client name required. Use -n <name>."; exit 1;
fi

if [[ ! -f "$CA_KEY" || ! -f "$CA_CRT" ]]; then
    echo "❌ CA key/cert ($CA_KEY / $CA_CRT) not found. Place them here or specify paths inside script.";
    exit 1;
fi

mkdir -p "$OUT_DIR"

RANDOM_SUFFIX=$(openssl rand -hex 3)
FINAL_NAME="${CLIENT_NAME}_${RANDOM_SUFFIX}"

echo "--- Generating client certificate for: $FINAL_NAME ---"
[[ -n "$CLIENT_EMAIL" ]] && echo "Email: $CLIENT_EMAIL"
echo "Role/OU: $CLIENT_ROLE"
echo "Org: $ORG  Country: $COUNTRY  Validity: $DAYS_CERT days"

CLIENT_CONF="$OUT_DIR/client_${FINAL_NAME}.conf"
CLIENT_EXT="$OUT_DIR/client_${FINAL_NAME}_ext.conf"

# Build DN sections. Add EMAILADDRESS if provided.
{
    echo "[ req ]"
    echo "default_bits       = $KEY_BITS"
    echo "prompt             = no"
    echo "default_md         = sha256"
    echo "distinguished_name = dn"
    echo "[ dn ]"
    echo "CN = $CLIENT_NAME"           # CN uses original name (not suffixed) for stable mapping
    echo "O = $ORG"
    echo "OU = $CLIENT_ROLE"
    echo "C = $COUNTRY"
    if [[ -n "$CLIENT_EMAIL" ]]; then
        echo "emailAddress = $CLIENT_EMAIL"  # EMAILADDRESS attribute for middleware (DN attribute EMAILADDRESS)
    fi
} > "$CLIENT_CONF"

# Extensions: include subjectAltName if email present for broader client support.
{
    echo "[ v3_usr ]"
    echo "basicConstraints = CA:FALSE"
    echo "subjectKeyIdentifier = hash"
    echo "authorityKeyIdentifier = keyid:always,issuer"
    echo "keyUsage = nonRepudiation, digitalSignature, keyEncipherment"
    echo "extendedKeyUsage = clientAuth"
    if [[ -n "$CLIENT_EMAIL" ]]; then
        echo "subjectAltName = email:$CLIENT_EMAIL"
    fi
} > "$CLIENT_EXT"

pushd "$OUT_DIR" > /dev/null

echo "-> Generating private key"
openssl genrsa -out "${FINAL_NAME}.key" "$KEY_BITS"

echo "-> Generating CSR"
openssl req -new -key "${FINAL_NAME}.key" -out "${FINAL_NAME}.csr" -config "client_${FINAL_NAME}.conf"

echo "-> Signing certificate with CA"
openssl x509 -req -in "${FINAL_NAME}.csr" -CA "$CA_CRT" -CAkey "$CA_KEY" -passin pass:"$CA_PASSWORD" -CAcreateserial -out "${FINAL_NAME}.crt" -days "$DAYS_CERT" -sha256 -extensions v3_usr -extfile "client_${FINAL_NAME}_ext.conf"

echo "-> Exporting PKCS#12 (.p12) (enter export password when prompted)"
openssl pkcs12 -export -out "${FINAL_NAME}.p12" -inkey "${FINAL_NAME}.key" -in "${FINAL_NAME}.crt" -certfile "$CA_CRT"

echo "-> Cleaning temporary CSR + config"
rm -f "${FINAL_NAME}.csr" "client_${FINAL_NAME}.conf" "client_${FINAL_NAME}_ext.conf"

if [[ "$KEEP_KEY_AND_CERT" != "true" ]]; then
    echo "-> Removing key and crt (keep only .p12). Use -k to keep them."
    rm -f "${FINAL_NAME}.key" "${FINAL_NAME}.crt"
else
    echo "-> Keeping key and certificate files (.key, .crt)."
fi

popd > /dev/null

echo "\n--- Completed for $FINAL_NAME ---"
echo "Output directory: $OUT_DIR"
echo "Files present:"; ls -1 "$OUT_DIR" | grep "$FINAL_NAME" || true
echo "Use DN attribute CN='$CLIENT_NAME' or EMAILADDRESS='$CLIENT_EMAIL' (if provided) for auto-login mapping."