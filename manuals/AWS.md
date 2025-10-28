# AWS

Diese Anleitung beschreibt, wie eine AMAZON EC2 Instanz (Amazon Elastic Compute Cloud) erstellt wird.  
Beim Ausführen der Befehle müssen einige Variablen notiert werden.  
Um diese zu notieren, kann man folgende Zeilen in einen Editor kopieren (manche Felder sind mit Standardwerten vorausgefüllt):

```
VARIABLE_SHEET
-------------------------------------
AWS Access Key ID =
AWS Secret Access Key =
REGION = eu-north-1
SECURITY_GROUP_ID = sg-...
SUBNET_ID = subnet-...
VPC_ID = vpc-...
INSTANCE_PUBLIC_IP =
INSTANCE_ID =
AMI_ID = ami-...
INSTANCE_TYPE = t3.micro
KEY_NAME = awdev-key
-------------------------------------
DATABASE_INFORMATON
-------------------------------------
# Der eindeutige Name für Ihren Cluster
DB_CLUSTER_IDENTIFIER =
# Der Benutzername für den Admin
MASTER_USERNAME =
# Das sichere Passwort für den Admin
MASTER_USER_PASSWORD =
# Die Security Group ID des DocumentDB-Clusters
VPC_SECURITY_GROUP_IDS
# Der Name des einzelnen Datenbank-Knotens
DB_INSTANCE_IDENTIFIER =

```

## 1. Bei der AWS-Konsole anmelden

- Öffne die AWS-Anmeldeseite:  
  [AWS Console Login](https://signin.aws.amazon.com/signin?client_id=arn%3Aaws%3Asignin%3A%3A%3Aconsole%2Fcanvas&redirect_uri=https%3A%2F%2Fconsole.aws.amazon.com%2Fconsole%2Fhome%3FhashArgs%3D%2523%26isauthcode%3Dtrue%26nc2%3Dh_si%26oauthStart%3D1760193915321%26src%3Dheader-signin%26state%3DhashArgsFromTB_REGION_72301735a0cad899&page=resolve&code_challenge=FCgPYQpD4n6JDfeeArrA3EQyPDedZvJn0amTLePi5UY&code_challenge_method=SHA-256&backwards_compatible=true)
- Melde dich mit deinen AWS-Zugangsdaten an.

---

## 2. Zugriffsschlüssel erstellen

- Ein Zugriffsschlüssel wird benötigt, um die AWS CLI zu verwenden.
- Gehe zu: [Access Key Wizard](https://us-east-1.console.aws.amazon.com/iam/home?region=REGION#/security_credentials/access-key-wizard)
- Klicke auf **Zugriffsschlüssel erstellen**.
- Notiere dir den **Zugriffsschlüssel** und den **Geheimen Zugriffsschlüssel** (diese können nur einmal eingesehen werden).
- Klicke auf **Fertig**.

---

## 3. AWS CLI installieren und konfigurieren

- Lade die AWS CLI herunter und installiere sie:  
  [AWS CLI Installation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Öffne ein Terminal (z. B. PowerShell).
- Führe den Befehl `aws configure` aus und gib die folgenden Informationen ein:
  - **AWS Access Key ID**: Dein Zugriffsschlüssel
  - **AWS Secret Access Key**: Dein geheimer Zugriffsschlüssel
  - **Default region name**: `REGION`
  - **Default output format**: `text`

---

## 4. Schlüsselpaar erstellen (für SSH-Verbindung)

- Gehe zu: [Key Pair Management](https://REGION.console.aws.amazon.com/ec2/home?region=REGION#KeyPairs)
- Klicke auf **Schlüsselpaar erstellen**.
- Gib einen Namen ein (z. B. `awdev-key`).
- Wähle das Dateiformat `.pem`.
- Klicke auf **Schlüsselpaar erstellen**.
- Die `.pem`-Datei wird automatisch heruntergeladen. Speichere sie an einem sicheren Ort.

---

## 5. VPC ID für die Region auslesen

- Führe den folgenden Befehl aus, um die VPCs in der Region aufzulisten:

```bash
aws ec2 describe-vpcs --region REGION

- in VARIABLE_SHEET VPC_ID eintragen
```

## Security Groups

- alle Gruppen auflisten:

```bash
aws ec2 describe-security-groups --query "SecurityGroups[*].{Name:GroupName, ID:GroupId, VPC:VpcId}" --output table --region REGION
```

- z.B. kann man für folgende Befehle die Gruppe mit Namen "default" verwenden
- in VARIABLE_SHEET SECURITY_GROUP_ID eintragen
- neue Gruppe erstellen:

```bash
aws ec2 create-security-group --group-name GROUP_NAME --description "DESCRIPTION" --vpc-id VPC_ID --region REGION
# Beispiel
aws ec2 create-security-group --group-name awdev-ssh-sg --description "Allow SSH Access" --vpc-id VPC_ID --region REGION
```

- Löschen mit dem Befehl

```bash
aws ec2 delete-security-group --group-id SECURITY_GROUP_ID --region REGION
```

## Sicherheitsgruppe Regel für den eingehenden Datenverkehr hinzufügen

- Für SSH PORT durch 22 ersetzen
- Will man eine Web App z.B. über Port 3000 erreichen PORT durch 3000 ersetzen

```bash
aws ec2 authorize-security-group-ingress --group-id SECURITY_GROUP_ID --protocol tcp --port PORT --cidr 0.0.0.0/0 --region REGION
```

## Alle Subnetz Ids einer Region auslesen

```bash
aws ec2 describe-subnets --query "Subnets[*].{ID:SubnetId, VPC:VpcId, AZ:AvailabilityZone, CIDR:CidrBlock, PublicIP:MapPublicIpOnLaunch}" --output table --region REGION
```

- in VARIABLE_SHEET SUBNET_ID eintragen

## EC2 instance

- neue Instanz erstellen:

```bash
aws ec2 run-instances
    --region REGION
    --image-id AMI_ID
    --instance-type INSTANCE_TYPE
    --key-name KEY_NAME # Name des Schlüsselpaares
    --security-group-ids SECURITY_GROUP_ID
    --subnet-id SUBNET_ID
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=INSTANCE_NAME}]"

# Beispiel
aws ec2 run-instances --region REGION --image-id ami-04c08fd8aa14af291 --instance-type t3.micro --key-name KEY_NAME --security-group-ids sg-... --subnet-id subnet-... --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=Meine-Instanz-1}]"
```

- alle laufenden Instanzen auflisten (--filters entfernen, um auch terminierte Instanzen aufzulisten)

```bash
aws ec2 describe-instances
    --filters "Name=instance-state-name,Values=running"
    --query "Reservations[*].Instances[*].{Name:Tags[?Key=='Name']|[0].Value,InstanceId:InstanceId,PublicIp:PublicIpAddress,Type:InstanceType,State:State.Name}"
    --output table
    --region REGION

# Beispiel
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].{Name:Tags[?Key=='Name']|[0].Value,InstanceId:InstanceId,PublicIp:PublicIpAddress,Type:InstanceType,State:State.Name}" --output table --region REGION
```

- enthält auch die öffentliche Ip (PublicIP)
- über diese kann man sich später mit SSH verbinden oder über diese eine gehostete Webseite aufrufen
- in VARIABLE_SHEET in die Variabel INSTANCE_PUBLIC_IP eintragen
- führe den folgenden Befehl aus, um eine Instanz zu beenden:

```bash
aws ec2 terminate-instances --instance-ids INSTANZ_ID --region REGION
```

## Per SSH mit Instanz verbinden

- verwende den folgenden Befehl, um dich per SSH mit der Instanz zu verbinden:

```bash
ssh -i "awdev-key.pem" ec2-user@INSTANCE_PUBLIC_IP
```

## Erstellen einer DocumentDB

WORK IN PROGRESS

- **Schritt 1**: Den DocumentDB Cluster erstellen

```bash
aws docdb create-db-cluster
    --db-cluster-identifier DB_CLUSTER_IDENTIFIER
    --engine docdb
    --master-username MASTER_USERNAME
    --master-user-password MASTER_USER_PASSWORD
    --vpc-security-group-ids VPC_SECURITY_GROUP_IDS
    --region REGION

# Einzeiler
aws docdb create-db-cluster --db-cluster-identifier DB_CLUSTER_IDENTIFIER --engine docdb --master-username MASTER_USERNAME --master-user-password MASTER_USER_PASSWORD --vpc-security-group-ids VPC_SECURITY_GROUP_IDS --region REGION
```

- **Schritt 2**: Die primäre Instanz hinzufügen

```bash
aws docdb create-db-instance
    --db-cluster-identifier DB_CLUSTER_IDENTIFIER
    --db-instance-identifier DB_INSTANCE_IDENTIFIER
    --db-instance-class db.r5.large
    --engine docdb
    --region REGION

# Einzeiler
aws docdb create-db-instance --db-cluster-identifier DB_CLUSTER_IDENTIFIER --db-instance-identifier DB_INSTANCE_IDENTIFIER --db-instance-class db.r5.large --engine docdb --region REGION
```
