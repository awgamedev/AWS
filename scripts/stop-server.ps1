# -----------------------------------------------------------
# AWS EC2 Instanz BEENDEN (Terminate) nach Name-Tag
# -----------------------------------------------------------

# === VARIABLEN DEFINITION ===
$REGION = "eu-north-1" 
$INSTANCE_NAME = "EC2-Instanz-1" 

# --- 1. INSTANZ ID FINDEN ---
Write-Host "Suche Instanz-ID für '$($INSTANCE_NAME)' in Region '$($REGION)'..."

# Argumente direkt übergeben
$params = @(
    "ec2",
    "describe-instances",
    "--region", $REGION,
    "--filters", "Name=tag:Name,Values=$INSTANCE_NAME",
    "--query", "Reservations[].Instances[].InstanceId",
    "--output", "text"
)

# KORRIGIERTE ZEILE: 
# Führt den AWS CLI Befehl aus. 
# Die Ausgabe (Stdout und Stderr zusammen: 2>&1) wird explizit in einen String ([string]()) umgewandelt.
# Das stellt sicher, dass $INSTANCE_ID_RAW niemals $null ist, sondern mindestens ein leerer String "".
$INSTANCE_ID_RAW = [string](& aws $params 2>&1)

# Führt .Trim() nun sicher aus, da $INSTANCE_ID_RAW ein String ist.
$INSTANCE_ID = $INSTANCE_ID_RAW.Trim()

# --- 2. ÜBERPRÜFUNG ---
# Prüft, ob $INSTANCE_ID leer oder nur Whitespace ist (fängt "" ab)
if ([string]::IsNullOrWhiteSpace($INSTANCE_ID)) {
    Write-Error "❌ Fehler: Konnte keine aktive Instanz-ID für den Namen '$($INSTANCE_NAME)' in Region '$($REGION)' finden."
    exit 1
} elseif ($INSTANCE_ID.Contains(" ")) {
    # Mehrere IDs gefunden, wenn der Name nicht eindeutig ist
    Write-Error "❌ Fehler: Es wurden mehrere Instanzen mit dem Namen '$($INSTANCE_NAME)' gefunden. IDs: $($INSTANCE_ID -join ', ')"
    Write-Error "Bitte passen Sie den Namen an oder beenden Sie die Instanzen manuell."
    exit 1
}

Write-Host "✅ Instanz-ID gefunden: $($INSTANCE_ID)"

# --- 3. INSTANZ BEENDEN (TERMINATE) ---
# ... (Rest des Skripts bleibt unverändert)
$terminate_command = "aws ec2 terminate-instances --instance-ids $($INSTANCE_ID) --region $($REGION)"

Write-Host "`n⚠️ WARNUNG: Beende EC2 Instanz mit der ID '$($INSTANCE_ID)'..."
Write-Host "Verwendeter Befehl: $($terminate_command)"

# Führt den AWS CLI Befehl aus
Invoke-Expression $terminate_command

# ... (Überprüfung des Exit Codes)
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ EC2 Instanz-Beendigungsbefehl erfolgreich gesendet."
    Write-Host "Instanz '$($INSTANCE_NAME)' ist nun im Status 'shutting-down' oder 'terminated'."
} else {
    Write-Error "`n❌ Fehler beim Ausführen des AWS CLI Befehls. Exit Code: $($LASTEXITCODE)"
    Write-Error "Stellen Sie sicher, dass die Instanz existiert und Sie die notwendigen Berechtigungen haben."
}