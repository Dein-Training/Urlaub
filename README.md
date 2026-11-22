# 📅 TZ-Urlaubsplanung

Urlaubsplaner des **Therapie- & Pflegezentrums Westlausitz**.

React-Frontend auf GitHub Pages, Datenbank und Anmeldung über Supabase.
Kein eigener Server nötig.

---

## 🗂 Projektstruktur

```
TZ-Urlaubsplanung/
├── frontend/
│   ├── src/
│   │   ├── App.jsx           ← komplette Anwendung
│   │   ├── supabase.js       ← Datenbankzugriff
│   │   └── main.jsx
│   ├── public/               ← Symbole, manifest.json
│   ├── index.html
│   ├── package.json
│   └── vite.config.js        ← base muss dem Repository-Namen entsprechen
├── .github/workflows/
│   ├── deploy.yml            ← baut und veröffentlicht bei Push auf main
│   └── test-build.yml        ← baut nur, auf allen anderen Zweigen
└── *.sql                     ← Datenbankskripte (siehe unten)
```

---

## 🚀 Einrichtung eines neuen Repositories

1. Repository **TZ-Urlaubsplanung** anlegen, Sichtbarkeit **Public**
   (GitHub Pages ist bei privaten Repositories kostenpflichtig).
2. Alle Dateien hochladen – einschließlich des Ordners `.github`.
3. **Settings → Pages → Source: GitHub Actions**
4. Zweig `test` anlegen: im Dateibrowser auf das Zweig-Menü,
   `test` eintippen, *Create branch: test from main*.

Heißt das Repository anders, muss `base` in `frontend/vite.config.js`
und `start_url`/`scope` in `frontend/public/manifest.json` angepasst werden —
sonst lädt die Seite leer.

Die Adresse der App ermittelt die Anwendung selbst aus dem Browser.
Sie muss nirgends eingetragen werden.

---

## 🔄 Ablauf bei Änderungen

```
Datei in Zweig "test" hochladen
        ↓
Actions → "Testbau" abwarten  (ca. 1 Minute)
        ↓
    grün?  →  Pull request  test → main  →  Merge  →  geht live
    rot?   →  Fehlermeldung prüfen, main bleibt unberührt
```

Den Zweig `test` nach jedem Merge löschen und beim nächsten Mal neu aus `main`
anlegen. Das vermeidet Konflikte.

---

## 🗄 Datenbank

Die Zugangsdaten stehen in `frontend/src/supabase.js`. Der dort hinterlegte
Schlüssel ist der **anon public key** – er ist für den Browser gedacht und
darf öffentlich sein. Der Schutz der Daten läuft über die
Row-Level-Security-Richtlinien in Supabase, nicht über diesen Schlüssel.

Der `service_role`-Schlüssel gehört **niemals** in dieses Repository.

### Skripte in dieser Reihenfolge

| # | Datei | Inhalt |
|---|---|---|
| 1 | `supabase-schema.sql` | Grundgerüst: profiles, entries |
| 2 | `notifications-sql.sql` | Benachrichtigungen |
| 3 | `SQL-updates.sql` | frühe Ergänzungen |
| 4 | `SQL-update-berechtigungen.sql` | Positionen, Rollen, RLS |
| 5 | `SQL-update-rezeption.sql` | Position Rezeption |
| 6 | `SQL-update-arbeitszeit.sql` | Wochenstunden, Arbeitstage |
| 7 | `SQL-update-kontoschutz.sql` | Schutz des Urlaubskontos |
| 8 | `SQL-update-ueberstunden.sql` | Überstundenanträge |
| 9 | `SQL-update-ueberstunden-buchung.sql` | Verbuchung absichern |
| 10 | `SQL-update-benachrichtigungen.sql` | Hinweise an die Leitung |
| 11 | `SQL-update-pauschal.sql` | Pauschalkräfte |
| 12 | `SQL-update-jahreskonten.sql` | Urlaubsanspruch je Jahr |
| 13 | `SQL-update-sparten.sql` | Therapie und Pflege |
| 14 | `SQL-update-positionskatalog.sql` | Positionen als Tabelle |
| 15 | `SQL-update-protokoll.sql` | Änderungsprotokoll |
| 16 | `SQL-update-einstellungen-konto.sql` | Regeln, Überstundenkonto |
| 17 | `SQL-update-zusatzrechte.sql` | Zusatzrechte, Regeln je Bereich |

Bei einer **bestehenden** Datenbank nur noch die Skripte ausführen,
die seit dem letzten Stand dazugekommen sind.

---

## 🔑 Zugänge

Benutzer werden ausschließlich in der App angelegt
(**Mitarbeiter → + Mitarbeiter anlegen**). Jeder erhält ein Startpasswort
und muss es beim ersten Anmelden ändern.

Passwörter gehören nicht in dieses Repository und nicht in Notizen.

---

## 🛠 Örtlich entwickeln (optional)

```bash
cd frontend
npm install
npm run dev
```
