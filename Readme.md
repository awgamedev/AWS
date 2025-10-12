# AWS

Hier wird beschrieben, wie eine AMAZON EC2 Instanz (Amazon Elastic Compute Cloud) ertstellt.
Beim ausführen der Befehle, muss man sich einige Variablen notieren.  
Um diese zu notieren kann man folgende Zeilen in einen Editor kopieren (manche Felder sind mit Standartwerten vorausgefüllt):

```
VARIABLE_SHEET
-------------------------------------
AWS Access Key ID =
AWS Secret Access Key =
REGION = eu-north-1
SECURITY_GROUP_ID = sg-...
SUBNET_ID = subnet-
VPC_ID = vpc-...
INSTANCE_PUBLIC_IP =
```

## Bei der Konsole anmelden:

- https://signin.aws.amazon.com/signin?client_id=arn%3Aaws%3Asignin%3A%3A%3Aconsole%2Fcanvas&redirect_uri=https%3A%2F%2Fconsole.aws.amazon.com%2Fconsole%2Fhome%3FhashArgs%3D%2523%26isauthcode%3Dtrue%26nc2%3Dh_si%26oauthStart%3D1760193915321%26src%3Dheader-signin%26state%3DhashArgsFromTB_eu-north-1_72301735a0cad899&page=resolve&code_challenge=FCgPYQpD4n6JDfeeArrA3EQyPDedZvJn0amTLePi5UY&code_challenge_method=SHA-256&backwards_compatible=true

## Zugriffsschlüssel erstellen

- wird für die AWS CLI benötigt
- https://us-east-1.console.aws.amazon.com/iam/home?region=eu-north-1#/security_credentials/access-key-wizard
- Zugriffsschlüssel erstellen
- "Zugriffsschlüssel" und "Geheimer Zugriffsschlüssel" speichern (kann man nur einmal einsehen)
- Fertig klicken

## AWS CLI

- AWS CLI herunterladen (Windows): https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- Powershell (oder anderes Terminal) öffnen
- Befehl "aws configure" eingeben
- AWS Access Key ID = Zugriffsschlüssel
- AWS Secret Access Key = Geheimer Zugriffsschlüssel
- Default region name = eu-north-1
- Default output format = text

## Schlüsselpaar erstellen (zum Verbinden via SSH)

- https://eu-north-1.console.aws.amazon.com/ec2/home?region=eu-north-1#KeyPairs
- "Schlüsselpaar erstellen" klicken
- Name eingeben (heißt später "awdev-key")
- Dateiformat .pem wählen
- "Schlüsselpaar erstellen" klicken
- .pem wird automatisch herunterladen (irgendwo ablegen, wo man es wiederverwenden kann)
- Im Beispiel heißt die .pem Datei: awdev-key.pem

## VPC ID für die Region auslesen

```bash
aws ec2 describe-vpcs --region REGION
# Beispiel
aws ec2 describe-vpcs --region eu-north-1
```

- Beispiel VCP_ID: vpc-0z9da5305aea25b94
- in VARIABLE_SHEET VPC_ID eintragen

## Security Groups

- alle Gruppen auflisten:

```bash
aws ec2 describe-security-groups --query "SecurityGroups[*].{Name:GroupName, ID:GroupId, VPC:VpcId}" --output table --region eu-north-1
```

- z.B. kann man für folgende Befehle die Gruppe mit Namen "default" verwenden
- in VARIABLE_SHEET SECURITY_GROUP_ID eintragen
- neue Gruppe erstellen:

```bash
aws ec2 create-security-group --group-name GROUP_NAME --description "DESCRIPTION" --vpc-id VPC_ID --region REGION
# Beispiel
aws ec2 create-security-group --group-name awdev-ssh-sg --description "Allow SSH Access" --vpc-id VPC_ID --region eu-north-1
```

- Löschen mit dem Befehl

```bash
aws ec2 delete-security-group --group-id SECURITY_GROUP_ID --region eu-north-1
```

## SSH für eine Sicherheitsgruppe einschalten

```bash
aws ec2 authorize-security-group-ingress
    --group-id SECURITY_GROUP_ID # ID der Sicherheitsgruppe
    --protocol tcp
    --port 22
    --cidr 0.0.0.0/0 # Zugriff von überall
    # --cidr <Ihre_öffentliche_IP>/32 # Deutlich sicherer (https://www.wieistmeineip.de/)
    --region eu-north-1

# Einzeiler:
aws ec2 authorize-security-group-ingress --group-id SECURITY_GROUP_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 --region eu-north-1
```

## Alle Subnetz Ids einer Region auslesen

```bash
aws ec2 describe-subnets --query "Subnets[*].{ID:SubnetId, VPC:VpcId, AZ:AvailabilityZone, CIDR:CidrBlock, PublicIP:MapPublicIpOnLaunch}" --output table --region eu-north-1
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
aws ec2 run-instances --region eu-north-1 --image-id ami-04c08fd8aa14af291 --instance-type t3.micro --key-name awdev-key --security-group-ids sg-... --subnet-id subnet-... --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=Meine-Instanz-2}]"
```

- alle laufenden Instanzen auflisten (--filters entfernen, um auch terminierte Instanzen aufzulisten)

```bash
aws ec2 describe-instances
    --filters "Name=instance-state-name,Values=running"
    --query "Reservations[*].Instances[*].{Name:Tags[?Key=='Name']|[0].Value,InstanceId:InstanceId,PublicIp:PublicIpAddress,Type:InstanceType,State:State.Name}"
    --output table
    --region REGION

# Beispiel
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].{Name:Tags[?Key=='Name']|[0].Value,InstanceId:InstanceId,PublicIp:PublicIpAddress,Type:InstanceType,State:State.Name}" --output table --region eu-north-1
```

- enthält auch die öffentliche Ip (PublicIP)
- über diese kann man sich später mit SSH verbinden oder über diese eine gehostete Webseite aufrufen
- in VARIABLE_SHEET in der Variabel INSTANCE_PUBLIC_IP eintragen

- Instanz terminieren

```bash
aws ec2 terminate-instances --instance-ids INSTANZ_ID --region eu-north-1
```

## Per SSH mit Instanz verbinden

```bash
ssh -i "awdev-key.pem" ec2-user@INSTANCE_PUBLIC_IP
```
