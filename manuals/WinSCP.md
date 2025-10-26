# WinSCP mit einer AWS Instanz verbinden

- Protocoll: SFTP
- Serveradress: PUBLIC_IP (of Instance)
- Username: ec2-user

Nun auf "Erweitert" klicken

- unter SSH -> Authentifizierung die .pem Datei unter "Datei mit privatem Schlüssel" auswählen und in eine .ppk Datei umwandeln lassen (passiert automatisch)
- Fenster mit "Ok" Schließen und die Anmeldung Speichern
- man kann sich auch direkt mit Putty in einem neuen Terminal verbinden
