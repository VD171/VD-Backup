> **Languages:** [English](../../CHANGELOG.md) · [العربية](../ar/CHANGELOG.md) · [Čeština](../cs/CHANGELOG.md) · Deutsch · [Español](../es/CHANGELOG.md) · [فارسی](../fa/CHANGELOG.md) · [Français](../fr/CHANGELOG.md) · [हिन्दी](../hi/CHANGELOG.md) · [Bahasa Indonesia](../in/CHANGELOG.md) · [Italiano](../it/CHANGELOG.md) · [日本語](../ja/CHANGELOG.md) · [한국어](../ko/CHANGELOG.md) · [Nederlands](../nl/CHANGELOG.md) · [Polski](../pl/CHANGELOG.md) · [Português](../pt/CHANGELOG.md) · [Русский](../ru/CHANGELOG.md) · [Svenska](../sv/CHANGELOG.md) · [ไทย](../th/CHANGELOG.md) · [Türkçe](../tr/CHANGELOG.md) · [Tiếng Việt](../vi/CHANGELOG.md) · [中文](../zh/CHANGELOG.md)

---

# Changelog

Alle nennenswerten Änderungen an VDBackup werden hier dokumentiert. Nur auf Englisch.

## v1.01

Erste öffentliche Veröffentlichung. Ein KernelSU/APatch/Magisk-WebUI-Modul, das Apps und ihre
Daten vollständig als Root sichert und wiederherstellt, ohne Berechtigungsabfrage.

Engine und Formate:

- Backup-/Wiederherstellungs-Engine läuft als abgekoppelter Root-Prozess (`setsid`): sie überlebt
  das Schließen der WebUI oder des Root-Managers, und die Oberfläche koppelt sich über `opid` wieder
  an den laufenden Fortschritt an.
- Drei Backup-Modi: Full (tar.zst, lokal oder remote), Snapshot (restic-Repo, verschlüsselt und
  dedupliziert) und Mirror (rclone/rsync 1:1-Synchronisierung). APKs werden immer komprimiert,
  auch in einem Mirror.
- Elemente pro App: APK (base + splits), `data`, `data_de`, `obb`, external und media. SELinux-Kontext,
  uid/gid, Modi und xattr/caps bleiben erhalten; die Wiederherstellung nutzt eine `pm install`-Sitzung
  und bildet Eigentümer/Kontext auf die aktive uid um.
- Durchgängig benutzerbezogen (Multi-User-fähig). Backups werden unter `/sdcard/VDBackup` (pro Benutzer)
  gespeichert, außerhalb von `/data/adb`, sodass sie vor dem ersten Entsperren nicht lesbar sind; jedes
  Ziel wird unter `<path>/vdbackup` mit einem Namensraum versehen.
- Kompression: keine, lz4, zstd (Stufen) oder gzip ("Kompatibilitätsmodus"). Ein JSON-Manifest erfasst
  das Gerät, das Paket (einschließlich App-Bezeichnung), Elemente und Berechtigungen.
- Portable Verschlüsselung mit `age` (Schlüsselerzeugung), zusätzlich ein PC-RECOVERY-Leitfaden, der in
  jedem verschlüsselten Backup mitgeliefert wird, sodass es überall ohne das Modul entschlüsselt und
  entpackt werden kann.

Ziele und Cloud:

- Ziele: hinzufügen/auflisten/testen/löschen (lokal, rclone-Remote, restic-Repo und ein optionaler
  Google-Drive-Begleiter); Zugangsdaten werden verschleiert gespeichert, niemals im Klartext.
- rclone-Remotes aus der UI/API erstellen (`remote-add`/`remote-list`/`remote-del`), sodass jedes
  Cloud-Backend (SFTP, SMB, WebDAV, FTP, S3, Google Drive und mehr) erreichbar ist, ohne `rclone.conf`
  von Hand zu bearbeiten.
- Google Drive auf zwei Wegen: über rclone (ohne Google-Cloud-Konto) oder die optionale, kopflose
  Begleit-App (`ru.vd171.vdbackup`), die einen verpflichtenden HMA-OSS-Verbergen-Hinweis trägt.
- Netzwerkrichtlinie: wählen, ob Cloud-Übertragungen jede Verbindung, nur WLAN oder nur Mobilfunkdaten
  nutzen dürfen; durchgesetzt für manuelle und geplante Aufträge. Lokale Ziele sind ausgenommen.

Migration herein:

- Import aus Neo-Backup, einschließlich passwortverschlüsselter Backups (AES-256-GCM, entschlüsselt
  durch den dex-Helfer; die WebUI fragt nach dem Passwort).
- Import aus Android-DataBackup (APKs installieren, user/user_de/data-Archive entpacken, umbilden).
- Beides gegen echte Backups auf mehreren Geräten validiert.

Integrität und Sicherheit:

- Getreue Wiederherstellung nach dem Prinzip Löschen-dann-Entpacken; sha256-Prüfung pro Archiv
  (standardmäßig an bei Full, und eine Repo-Integritätsprüfung bei Snapshot), Trockenlauf und
  Wiederherstellungstest. Archive werden auf Vollständigkeit zurückgelesen; ein beschädigtes Archiv
  oder ein ungültiger Paketname kann niemals eine zerstörerische Wiederherstellung auslösen, und
  Fehler bei Remote-Übertragungen werden gemeldet, nie stillschweigend übergangen.
- Selektive Wiederherstellung: eine beliebige Teilmenge der Elemente eines Backups wiederherstellen
  (APK, data, geschützte Daten, OBB, external, media), standardmäßig alle ausgewählt.
- Backups aus der UI/API löschen (`delete-backup`) und keep-last-N-Aufbewahrung für manuelle Backups
  (`prune`); jede Löschung, Wiederherstellung, Bereinigung und jeder geplante Lauf wird in ein lokales
  JSON-Audit-Protokoll geschrieben, das du in der App ansehen kannst.
- Laufzeitberechtigungen und AppOps werden im Manifest erfasst und bei der Wiederherstellung erneut
  angewendet. Die Installationsquelle (installerPackageName) sowie der aktivierte/deaktivierte Status
  werden ebenfalls erfasst und bei der Wiederherstellung erneut angewendet.
- Fälschen der Installationsquelle: standardmäßig meldet eine wiederhergestellte App den Play Store
  als ihre Installationsquelle (zur Installationszeit über die Installationssitzung gesetzt, da eine
  wiederhergestellte App andernfalls sideloaded aussieht); global und pro Wiederherstellung umschaltbar,
  und ausgeschaltet bleibt die erfasste Quelle erhalten. Ein erweiterter Opt-in-"Deep"-Modus fälscht
  zusätzlich das initiierende Paket und die Paketquelle durch Bearbeiten der System-Paketdatenbank
  (zuvor byte-genaues Backup, wirkt nach einem Neustart), sodass die App vollständig store-installiert
  aussieht.
- SSAID (Geräte-ANDROID_ID): streng opt-in und auffällig gekennzeichnet; ABX-fähig; die aktive Datei
  wird vor jedem Überschreiben für ein Rollback stets byte-genau gesichert; wirkt nach einem Neustart.
- Wiederherstellung und Import erfordern eine ausdrückliche Bestätigung "dies überschreibt die aktuellen
  App-Daten", bevor fortgefahren wird.

Zeitplanung und Automatisierung:

- Geplante Backups mit keep-N-Aufbewahrung, verwaltet über einen Zeitplan-Tab (pro App,
  täglich/stündlich/wöchentlich mit optionaler Uhrzeit, Modus und Ziel).
- Automatisches Backup bei Installation oder Update: ein Opt-in-Beobachter reitet auf dem
  Scheduler-Heartbeat, sichert neue oder aktualisierte Apps im Hintergrund und initialisiert nur beim
  ersten Lauf, sodass das Aktivieren nie alles auf einmal sichert. Berücksichtigt die Einstellung für
  ausgeschlossene Apps (Sperrliste).

Spezial-Backups (systemweit):

- Nachrichten (SMS/MMS), Kontakte und Anrufliste, WLAN und Bluetooth als rohe, getreu archivierte
  Systemdaten sichern (dieselbe SELinux-/xattr-Bewahrung und optionale age-Verschlüsselung wie bei
  App-Backups). Die Wiederherstellung ist auf demselben Gerät/derselben ROM getreu, erfordert einen
  Neustart und ist hinter einer auffälligen Überschreiben-und-Neustart-Bestätigung abgesichert.
- Optionaler portabler Export neben dem rohen Archiv: Nachrichten, Anrufliste und Kontakte werden auch
  als öffenbares JSON geschrieben (mit dem gebündelten sqlite3 direkt aus den Provider-Datenbanken
  gelesen, sodass Nachrichtentexte mit Kommas oder Zeilenumbrüchen intakt bleiben), was eine
  geräteübergreifende Kopie ohne Modul ergibt. Die portable Kopie wird ebenfalls verschlüsselt, wenn
  das Backup verschlüsselt ist, sodass sie nie preisgibt, was das Archiv schützt.

Systemintegration:

- Eine installierte App als System-App einhängen, ohne die echte /system-Partition anzufassen:
  VDBackup stellt das/die APK(s) der App in ihr eigenes Overlay-Submodul bereit, das der root-Manager
  einhängt. Mit NoMount auf KernelSU wird es live eingespielt (kein Neustart); andernfalls greift es
  beim nächsten Start, sodass es nie davon abhängt, dass NoMount installiert ist. Wähle reguläre oder
  privilegierte Platzierung.

WebUI:

- Die App-Liste zeigt den echten lokalisierten App-Namen (aus der APK aufgelöst, sodass er eine
  Deinstallation übersteht) neben dem Paket, mit verzögert geladenen, zwischengespeicherten Symbolen,
  die als abgerundete, adaptiv-fähige Kacheln dargestellt werden.
- Auf eine App tippen, um ihren Backup-Verlauf zu öffnen und jedes frühere Backup wiederherzustellen;
  der Reiter Backups zeigt Name und Paket in getrennten Zeilen und öffnet pro Backup ein Detailblatt
  (Version, Installationsquelle, Status, Datum, Größe, Elemente, Berechtigungszahlen, Gerät).
- Die App-Liste nach Benutzer/System/alle filtern und nach Name oder Paket sortieren; mehrere Apps
  auswählen und in einem Batch sichern; Apps von automatischen und geplanten Backups ausschließen.
- Auswählen, was einbezogen wird, und Verify oder Dry-run pro Backup umschalten; eine reine
  Test-Wiederherstellung wählen, die ins Staging extrahiert, ohne die Live-App zu berühren.
- Helles/dunkles Design, eine Akzentfarbauswahl, Sprachauswahl, ein Reiter "Über" (mit den
  Schwesterprojekten und dem Audit-Manifest der gebündelten Binärdateien), ein Ordnerauswähler für
  das lokale Ziel, lokalisierter Fortschritt der Vorgänge mit sofortiger Rückmeldung und moderne
  In-App-Dialoge (keine System-Alert-/Bestätigungs-Pop-ups).
- Die Zurück-Taste führt zum vorherigen Reiter zurück und schließt zuerst Dialoge; Dialoge schweben,
  und die App übersteht ein erneutes Öffnen, indem sie sich wieder an laufende Operationen anhängt.

KI-freundlich und i18n:

- Eine dokumentierte JSON-Steuerungsfläche, damit Agenten jede Aktion kopflos verwalten können
  (`docs/AI-AGENTS.md`); die WebUI ist nur ein Client dieser API.
- Die README und die gesamte Projektdokumentation sind in die 21 Standardsprachen übersetzt
  (`docs/<lang>/`), wobei die Dokumentation ins Wiki gespiegelt wird.
- Die reichhaltige App-Auflistung und die Neo-Entschlüsselung laufen über einen als Root gesteuerten
  dex-Helfer (`IPackageManager` über ServiceManager), sodass sie auch dort funktionieren, wo
  ActivityThread hängt.
