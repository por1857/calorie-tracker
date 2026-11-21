# Architektur

## Überblick

Eine **PWA** (Progressive Web App): eine normale Webseite aus HTML, CSS und
JavaScript, die man auf dem iPhone zum Home-Bildschirm hinzufügt und die
sich dann wie eine App verhält.

- **Phase 1 (jetzt):** nur für dich, alle Daten auf dem iPhone, kein Server.
  Die App liegt auf GitHub Pages und ist von überall erreichbar.
- **Phase 2 (später):** Java-Backend mit Spring Boot für Konten, geteilte
  Lebensmittel und private Tagebücher, rund um die Uhr auf einem eigenen Server.
  Plan: [BACKEND.md](BACKEND.md).
- **App ohne Framework, ohne Build-Schritt.** Die Dateien, die du schreibst,
  sind genau die Dateien, die der Browser lädt.

Das Repo hat zwei Teile: `frontend/` (die App, JavaScript) und später
`backend/` (Spring Boot, Java). Die Pfade unten gelten in `frontend/`.

```
 index.html + css/                      Oberfläche
        │
 js/app.js        steuert alles, zeichnet die Seite
   ├── js/calc.js      Rechnen                       ┐
   ├── js/dates.js     Tage "JJJJ-MM-TT"             │ mit Tests,
   ├── js/format.js    Anzeige (Zahlen, Daten)       │ ohne HTML
   ├── js/models.js    Datensätze erzeugen + prüfen  │
   ├── js/search.js    Lebensmittel suchen           ┘
   ├── js/ui/entry-sheet.js  Fenster "Eintrag hinzufügen"
   └── js/storage/store.js   die EINE Tür zu den Daten
          ├── memory-store.js     Arbeitsspeicher (Demo, Tests, Notfall)
          ├── indexeddb-store.js  dauerhaft im iPhone (Standard)
          └── sync-store.js       Phase 2: iPhone + Java-Backend
```

Die App kennt nur `openStore()`. Welcher Store dahinter steckt, entscheidet
`store.js`. So wird aus der Einzelversion später die Freunde-Version, ohne
`app.js` umzubauen. Jeder Store muss `tests/store-contract.js` bestehen.

## Ordnerstruktur

```
kalorien-tracker/
├── AGENTS.md             Regeln für mich und jede KI
├── README.md
├── .github/workflows/    testen und veröffentlichen (GitHub Actions)
├── docs/                 Architektur, Styleguide, Backend-Plan
├── backend/              Phase 2: Spring Boot (noch nicht angelegt)
└── frontend/
    ├── index.html            die App
    ├── styleguide.html       Vorschau aller Bausteine
    ├── manifest.webmanifest  Name, Icon, Farben für den Home-Bildschirm
    ├── package.json          Befehle: npm test, npm start
    ├── css/
    │   ├── tokens.css        Farben, Schrift, Abstände (Design-Tokens)
    │   ├── base.css          Grundeinstellungen, iPhone-Ränder
    │   ├── components.css    Bausteine (Buttons, Balken, ...)
    │   └── styleguide.css    nur für styleguide.html
    ├── js/
    │   ├── app.js            Startpunkt
    │   ├── calc.js           Rechenlogik
    │   ├── dates.js          Tages-Schlüssel
    │   ├── format.js         Anzeigeformat
    │   ├── models.js         Datenmodell und Eingabeprüfung
    │   ├── search.js         Suche (Umlaute, mehrere Wörter)
    │   ├── ui/
    │   │   └── entry-sheet.js    Fenster "Eintrag hinzufügen"
    │   └── storage/
    │       ├── store.js          Schnittstelle + Auswahl des Stores
    │       ├── memory-store.js   Store im Arbeitsspeicher
    │       └── indexeddb-store.js  Store in IndexedDB (dauerhaft)
    ├── tests/
    │   ├── *.test.js         Unit-Tests (npm test)
    │   ├── store-contract.js Vertragstest für alle Stores
    │   ├── browser.html      Vertragstest im Browser (echtes IndexedDB)
    │   └── browser/          Ersatz für node:test im Browser
    └── icons/                App-Icons (icon.svg ist die Vorlage)
```

## Datenmodell

Nährwerte von Lebensmitteln **pro 100 g**, alle Zahlen **ungerundet**.
Erzeugt werden Datensätze nur über die Funktionen in `js/models.js`.

**Lebensmittel** (geteilt, ab Phase 2 für alle Freunde sichtbar)
```js
{
  id: "3b241101-e2bb-4255-8caf-4136c566a962",   // UUID
  name: "Haferflocken",
  per100g: { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 },
  defaultGrams: 80,                 // übliche Portion, oder null
  createdBy: null,                  // Phase 2: Benutzer-ID des Erstellers
  createdAt: "2026-11-21T14:05:00.000Z",
  updatedAt: "2026-11-21T14:05:00.000Z",
  deletedAt: null                   // gesetzt = gelöscht
}
```

**Eintrag** (privat)
```js
{
  id: "9c1f…",
  userId: null,                     // Phase 2: wem der Eintrag gehört
  dayKey: "2026-11-21",             // lokaler Tag, NICHT toISOString()!
  meal: "breakfast",                // breakfast | lunch | dinner | snack
  foodId: "3b24…",                  // null bei Schnelleintrag
  name: "Haferflocken",             // Kopie, damit alte Tage gleich bleiben,
  grams: 80,                        //   auch wenn das Lebensmittel später
  kcal: 297.6, protein: 10.8,       //   geändert oder gelöscht wird
  carbs: 46.96, fat: 5.6,           // grams ist null bei Schnelleintrag
  createdAt: "…", updatedAt: "…", deletedAt: null
}
```

**Ziele** (privat, ein Datensatz)
```js
{ id: "goals", userId: null, kcal: 2000, protein: 150, carbs: 220, fat: 70, updatedAt: "…" }
```

**Zwei Arten von Zeit:**

- `dayKey` ist ein **Tag** in deiner lokalen Zeit ("2026-11-21").
- `createdAt`, `updatedAt`, `deletedAt` sind **Zeitpunkte** in UTC (ISO-Text).

**Gelöscht wird weich:** `deletedAt` wird gesetzt, der Datensatz bleibt.
Listen blenden ihn aus. So erfahren in Phase 2 auch andere Geräte vom Löschen,
und alte Einträge finden ihr Lebensmittel weiterhin.

## Speicher im iPhone (IndexedDB)

Datenbank `kalorien-tracker` mit drei Bereichen: `foods`, `entries` (mit
Index `dayKey`) und `settings` (Ziele). Der Aufbau ist versioniert wie
Flyway-Migrationen: `MIGRATIONS` in `indexeddb-store.js`. Eine Stufe, die
schon auf dem iPhone lief, wird nie geändert; Änderungen kommen als neue Stufe.

Die Daten gehören zur Adresse der App. Wer sie wechselt (z. B. auf die eigene
Domain in Phase 2), braucht Export und Import (Schritt 7).

## Roadmap

**Phase 1: Einzelversion**

- [x] Schritt 1: Grundgerüst, Styleguide, Rechenlogik mit Tests
- [x] Vorbereitung: Datenmodell für Mehrbenutzer, austauschbarer Store
- [x] Schritt 2: `indexeddb-store.js`, dauerhaft speichern
- [x] Schritt 3: Eintrag hinzufügen (Lebensmittel suchen, Gramm eingeben), Eintrag löschen
- [ ] Schritt 4: Lebensmittel anlegen (erledigt), bearbeiten und löschen im Tab "Lebensmittel"
- [ ] Schritt 5: Schnelleintrag, Einträge bearbeiten und löschen
- [ ] Schritt 6: Ziele einstellen
- [ ] Schritt 7: Export/Import als JSON (Backup)
- [ ] Schritt 8: Service Worker, damit die App offline startet

**Phase 2: Java-Backend für Freunde** → [BACKEND.md](BACKEND.md)

**Später vielleicht:** Barcode-Scan mit Open Food Facts, Wochenübersicht.

## Sicherheit (Kurzfassung)

| Risiko | Schutz |
|---|---|
| Eingeschleuster Code über Lebensmittelnamen (XSS) | nur `textContent`, nie `innerHTML` |
| Fremde Skripte | Content-Security-Policy in `index.html` erlaubt nur eigene Dateien |
| Unsinnige Eingaben | `validateFoodInput`, `validateGrams` in `models.js` |
| Persönliche Daten im Git-Repo | Daten nur im Browser; Backups und `.env` per `.gitignore` ausgeschlossen |
| Datenverlust (iOS kann Website-Daten löschen) | regelmäßig JSON-Export (Schritt 7) |
| Phase 2: fremde Daten lesen | Berechtigungsprüfung im Service, mit Tests, siehe [BACKEND.md](BACKEND.md) |
