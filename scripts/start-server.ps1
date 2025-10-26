# -----------------------------------------------------------
# AWS EC2 Instanzstart-Skript (Bildungszwecke)
#
# Dieses Skript verwendet den AWS CLI 'run-instances' Befehl,
# um eine neue EC2 Instanz zu starten.
#
# VORAUSSETZUNGEN:
# 1. AWS Command Line Interface (CLI) muss installiert sein.
# 2. AWS-Zugangsdaten müssen konfiguriert sein (z.B. über 'aws configure').
# -----------------------------------------------------------

# === VARIABLEN DEFINITION ===
# Ersetzen Sie die Platzhalterwerte (die Großbuchstaben-Strings)
# durch Ihre tatsächlichen AWS-Konfigurationswerte.

$REGION = "eu-north-1"
$AMI_ID = "ami-04c08fd8aa14af291" # Beispiel: ID eines Amazon Machine Images (AMI)
$INSTANCE_TYPE = "t3.micro" # Beispiel: 't2.micro'
$KEY_NAME = "awdev-key" # Der Name Ihres AWS-Schlüsselpaares
$SECURITY_GROUP_ID = "sg-0519f8856cda6cd4a" # Die ID der Sicherheitsgruppe
$SUBNET_ID = "subnet-02320478e62fd427f" # Die ID des Subnetzes, in dem die Instanz gestartet werden soll
$INSTANCE_NAME = "EC2-Instanz-1" # Der Name-Tag der neuen Instanz

# Der vollständige AWS CLI Befehl, aufgeteilt zur besseren Lesbarkeit
$command = "aws ec2 run-instances"
$command += " --region $($REGION)"
$command += " --image-id $($AMI_ID)"
$command += " --instance-type $($INSTANCE_TYPE)"
$command += " --key-name $($KEY_NAME)"
$command += " --security-group-ids $($SECURITY_GROUP_ID)"
$command += " --subnet-id $($SUBNET_ID)"
$command += " --tag-specifications `
    ""ResourceType=instance,Tags=[{Key=Name,Value=$($INSTANCE_NAME)}]"""

# === AUSFÜHRUNG ===

Write-Host "Starte EC2 Instanz '$($INSTANCE_NAME)' in Region '$($REGION)'..."
Write-Host "Verwendeter Befehl: $($command)"

# Führt den AWS CLI Befehl aus
Invoke-Expression $command

# Überprüfung des Exit Codes (optional, aber empfohlen)
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ EC2 Instanzstart-Befehl erfolgreich gesendet."
    Write-Host "Bitte überprüfen Sie die AWS Konsole oder verwenden Sie 'aws ec2 describe-instances' für den aktuellen Status."
} else {
    Write-Error "`n❌ Fehler beim Ausführen des AWS CLI Befehls. Exit Code: $($LASTEXITCODE)"
    Write-Error "Stellen Sie sicher, dass Ihre AWS-Variablen und die CLI-Konfiguration korrekt sind."
}