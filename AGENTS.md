# AGENTS.md – Kalorien-Tracker

> **Verbindlich für mich und für jede KI** (Claude, ChatGPT, Copilot, Junie …).
> Die meisten KI-Werkzeuge lesen diese Datei automatisch; im Browser-Chat anhängen.
> Bei Widerspruch gilt: **diese Datei > Gewohnheit > KI-Vorschlag.**
> Abgeleitet aus den Guides des Teamprojekts, aber nur, was für eine kleine App passt
> (was bewusst fehlt, steht in Abschnitt 13).

---

## 0. Projektfakten

### 0.1 Das Repository ist die Wahrheit
Diese Datei beschreibt **Regeln**, nicht den aktuellen Code. Vor jeder Änderung den
Stand im Repo prüfen:

| Was | Wo |
|---|---|
| Frontend: Abhängigkeiten, Befehle | `frontend/package.json` |
| Frontend: Code, Tests, Styles | `frontend/js/`, `frontend/tests/`, `frontend/css/` |
| Backend: Java-, Spring-Boot-Version, **alle Abhängigkeiten** | `backend/build.gradle.kts` (sobald angelegt) |
| Datenbank-Schema | `backend/src/main/resources/db/migration/` |
| Aufbau, Datenmodell, Roadmap | `docs/ARCHITEKTUR.md` |
| Design- und UI-Regeln | `docs/STYLEGUIDE.md` |
| Backend-Plan, Hosting | `docs/BACKEND.md` |

- Widersprechen sich Datei und Repo, **gewinnt das Repo**; die Datei wird angepasst.
- Eine Technik gehört nur zum Stack, wenn sie in `package.json` oder
  `build.gradle.kts` steht. Nie annehmen, dass eine Bibliothek da ist.
- Vor dem Anlegen einer Datei, Funktion oder Klasse prüfen, ob es sie schon gibt.

### 0.2 Stack

| Teil | Technik |
|---|---|
| App (Frontend) | PWA: HTML, CSS, JavaScript (ES-Module), **ohne Framework, ohne Build-Schritt** |
| Speicher am Gerät | IndexedDB (ab Schritt 2), Zugriff nur über `js/storage/` |
| Tests Frontend | eingebauter Test-Runner von Node.js (`node --test`), ab Node 20 |
| Backend (Phase 2) | Java + Spring Boot, Gradle Kotlin DSL, immer über `gradlew` |
| Datenbank (Phase 2) | PostgreSQL, Schema über **Flyway**; Tests mit H2 |
| Hosting | Frontend: GitHub Pages über GitHub Actions. Backend: eigener Server, siehe `docs/BACKEND.md` |
| IDE | IntelliJ IDEA |

### 0.3 Befehle
```powershell
# Frontend (im Ordner frontend)
npm test                  # alle Tests
npm start                 # lokaler Server, Adresse im Terminal

# Backend (im Ordner backend, sobald angelegt)
.\gradlew.bat test
.\gradlew.bat bootRun
```

### 0.4 Abhängigkeiten
**Keine neue Abhängigkeit ohne Begründung.** Das Frontend hat bewusst keine.
Eine neue Bibliothek kommt nur mit einem eigenen Commit, der im Text sagt, warum.
Beispiele, die erst erlaubt sind, wenn sie im Build stehen: Frontend-Framework,
Lombok, MapStruct, ein zweites Migrations-Werkzeug.

---

## 1. Grundprinzipien

1. **Lesbarkeit vor Cleverness.**
2. **Kleine Einheiten.** Funktionen/Methoden höchstens ~30 Zeilen, eine Aufgabe pro Datei/Klasse.
3. **Keine magischen Zahlen oder Texte.** Konstanten, Enums, Tokens.
4. **Früh scheitern.** Eingaben sofort prüfen, klare Fehlermeldung.
5. **Kein toter oder auskommentierter Code.** Git hat die Geschichte.
6. **Einheitlichkeit vor Geschmack.** Gibt es schon ein Muster, wird es befolgt.

---

## 2. Sprache und Benennung

- **Bezeichner, Commit-Nachrichten: Englisch.**
- **Kommentare: Deutsch** (Lernprojekt). Nur dort, wo der Code das *Warum* nicht selbst sagt.
- **Texte in der App: Deutsch (Österreich)**, Regeln in `docs/STYLEGUIDE.md`.
- `README.md` und `docs/`: Deutsch, kurz halten.
- Fachbegriffe nur mit den Namen aus dem **Glossar (Abschnitt 3)**.

| Element | Konvention | Beispiel |
|---|---|---|
| JS-Funktionen, Variablen | camelCase, Funktionen mit Verb | `createFood()`, `dayKey` |
| JS-Konstanten | UPPER_SNAKE_CASE | `DEFAULT_GOALS`, `MEAL_IDS` |
| JS-Dateien | kebab-case | `memory-store.js` |
| CSS-Klassen | BEM | `.readout__value`, `.button--primary` |
| Java-Klassen | PascalCase, Nomen | `FoodService`, `EntryController` |
| Java-Methoden, Felder | camelCase | `findUpdatedSince()`, `createdBy` |
| Booleans (beide Sprachen) | `is/has/can` | `isActive`, `isOver` |
| DTOs (Java) | `record`, Endung `Dto` | `FoodDto`, `EntryDto` |
| URL-Pfade | kebab-case, Plural | `/api/v1/foods/{id}` |
| Tabellen, Spalten | snake_case | `entry`, `day_key` |
| Branches | `feat/…`, `fix/…` | `feat/indexeddb-store` |

**Verboten als alleinstehende Namen:** `data`, `info`, `temp`, `manager`, `util`,
`helper`, `x`, `obj`.

---

## 3. Glossar (Pflichtnamen)

| Begriff | Code-Name | Hinweis |
|---|---|---|
| Lebensmittel | `Food` / `food` | **geteilt**: alle sehen es, nur der Ersteller ändert es |
| Nährwerte pro 100 g | `per100g` | `{ kcal, protein, carbs, fat }` |
| Nährwerte | `kcal`, `protein`, `carbs`, `fat` | genau diese vier, nie `calories`, `kh`, `fats` |
| Eintrag | `Entry` / `entry` | **privat**, kopiert Name und Werte des Lebensmittels |
| Schnelleintrag | `QuickEntry` / `createQuickEntry` | Eintrag ohne Lebensmittel und ohne Gramm |
| Mahlzeit | `Meal` / `meal` | `breakfast`, `lunch`, `dinner`, `snack` |
| Tag eines Eintrags | `dayKey` | lokaler Tag `"JJJJ-MM-TT"`, nie ein Zeitpunkt |
| Tagesziele | `Goals` / `goals` | privat, ein Datensatz pro Benutzer |
| Benutzer | `User` / `userId` | Tabelle `app_user` (`user` ist in PostgreSQL reserviert) |
| Ersteller | `createdBy` | bei Lebensmitteln |
| Gelöscht (weich) | `deletedAt` | gesetzt = gelöscht |
| Speicher (Frontend) | `Store` | jede Implementierung erfüllt `tests/store-contract.js` |

Neue Fachbegriffe zuerst hier eintragen, dann im Code verwenden.

---

## 4. Architektur

### 4.1 Frontend (`frontend/`)
```
app.js  →  calc.js, dates.js, format.js, models.js   (Logik, ohne DOM)
   └────→  storage/store.js  →  memory-store.js | indexeddb-store.js | sync-store.js
```
- **Logik-Module** (`calc`, `dates`, `format`, `models`) kennen kein HTML, kein
  `document`, kein `fetch`. Nur so sind sie testbar.
- **Daten nur über den Store.** `app.js` greift nie direkt auf IndexedDB oder `fetch` zu.
- **Datensätze nur über `models.js`** erzeugen (`createFood`, `createEntryFromFood` …),
  nie von Hand.
- Jeder neue Store besteht den Vertragstest `tests/store-contract.js`.

### 4.2 Backend (`backend/`, Phase 2)
Vereinfacht gegenüber dem Teamprojekt: **nach Fachbereich gegliedert**, darin klare Rollen.
```
src/main/java/<root-package>/
├── <App>Application.java
├── config/        SecurityConfig, ClockConfig
├── common/        ApiExceptionHandler, NotFoundException, ForbiddenException
├── food/          FoodController, FoodService, FoodRepository, FoodEntity, FoodDto
├── entry/         EntryController, EntryService, EntryRepository, EntryEntity, EntryDto
├── goals/         GoalsController, GoalsService, GoalsRepository, GoalsEntity, GoalsDto
└── user/          UserService, UserRepository, UserEntity
```
- **Richtung:** Controller → Service → Repository. Nie Controller → Repository.
- **Controller** (`@RestController`): nur HTTP, Validierung mit `@Valid`, keine Geschäftslogik.
- **Service** (`@Service`): Geschäftslogik, `@Transactional`, **Berechtigungsprüfungen**.
- **Repository**: Spring-Data-Interface, keine Logik.
- **Entities verlassen nie den Service.** Nach außen gehen nur DTO-Records
  (`FoodDto.fromEntity(...)`).
- **Konstruktor-Injektion**, Felder `private final`, kein `@Autowired` auf Feldern.
- **Uhrzeit über eine injizierte `Clock`** (Zone `Europe/Vienna`), nie `LocalDate.now()` direkt.
- Logging mit SLF4J, nie `System.out.println`; keine persönlichen Daten in Logs.

---

## 5. Fachliche Pflichtregeln

1. **Lebensmittel sind geteilt, Einträge und Ziele privat.** Prüfung im Backend
   immer im Service, nie nur in der Oberfläche.
2. **Nur der Ersteller** darf ein Lebensmittel ändern oder löschen (sonst 403).
3. **Nie hart löschen.** `deletedAt` setzen; Listen blenden Gelöschtes aus,
   der Abgleich überträgt es.
4. **IDs sind UUIDs, vom Gerät erzeugt** (`newId()`). Das Backend übernimmt sie,
   damit Offline-Einträge beim Abgleich nicht doppelt entstehen.
5. **Zwei Arten von Zeit:** `dayKey` ist ein Tag (lokal, `LocalDate`);
   `createdAt`/`updatedAt`/`deletedAt` sind Zeitpunkte in UTC (`Instant`).
6. **Nährwerte pro 100 g, ungerundet speichern, erst bei der Anzeige runden.**
   Nährwerte sind kein Geld: `double` in Java ist in Ordnung.
7. **Einträge kopieren Name und Nährwerte**; spätere Änderungen am Lebensmittel
   verändern alte Tage nicht.
8. **Abgleich:** neuerer `updatedAt` gewinnt.
9. **Eingaben doppelt prüfen:** in `models.js` für gute Fehlermeldungen,
   im Backend mit `jakarta.validation` als Schutz.

---

## 6. Oberfläche (aus dem UI-Guide)

- **Tokens zuerst:** Farben, Abstände, Schrift nur aus `css/tokens.css`.
- **Bausteine wiederverwenden** (`components.css`) statt Sonderstile.
  Auch per JavaScript erzeugte Elemente bekommen die gemeinsamen Klassen.
- Reihenfolge der Stylesheets: `tokens.css` → `base.css` → `components.css`.
- Keine `style`-Attribute im HTML (die Sicherheitsregel blockiert sie ohnehin).
- Text ins DOM **nur mit `textContent`**, nie mit `innerHTML`.
- Vor dem Commit prüfen: Handy-Breite (375 px), Dunkelmodus, kein seitliches
  Scrollen, alle Knöpfe einmal angetippt.
- Details und Checkliste: `docs/STYLEGUIDE.md`.

---

## 7. REST-API (Backend)

- Versioniert unter `/api/v1/...`, Ressourcen im Plural, kebab-case.
- Bodies sind DTO-Records, nie Entities.
- Statuscodes: `200`, `201`, `204`, `400` Validierung, `401` nicht angemeldet,
  `403` keine Berechtigung, `404` nicht gefunden.
- Einheitliches Fehlerformat über `ApiExceptionHandler`:
  ```json
  { "error": "FOOD_NOT_OWNED", "message": "Only the creator can change this food", "timestamp": "..." }
  ```
- Listen für den Abgleich: `GET /api/v1/foods?updatedSince=<Zeitpunkt>`.
- Endpunkte und Abgleich: `docs/BACKEND.md`.

---

## 8. Datenbank

- **Schema nur über Flyway-Migrationen** (`V1__baseline.sql`, `V2__…`),
  Hibernate prüft nur (`ddl-auto=validate`).
- **Eine Migration, die schon auf dem Server lief, wird nie geändert.**
  Fehler mit einer neuen Migration beheben.
- **Migrationen müssen auf Tabellen mit Daten funktionieren:** eine neue
  `NOT NULL`-Spalte braucht einen `DEFAULT` für bestehende Zeilen.
- Jede Änderung an einer Entity kommt mit ihrer Migration im selben Commit.

---

## 9. Tests

- **Jede fachliche Regel hat einen Test.** Besonders: Umrechnen und Summieren,
  Eingabeprüfung, Tage über Monats- und Zeitumstellungsgrenzen, Berechtigungen
  (fremdes Lebensmittel ändern = 403, fremde Einträge unsichtbar).
- Aufbau: Vorbereiten / Ausführen / Prüfen (Arrange / Act / Assert).
- Frontend: Testbeschreibungen auf Deutsch, eine Datei `*.test.js` pro Modul.
- Backend: Namen `method_condition_expectedResult`; Services als reine Unit-Tests
  mit Mockito, Controller mit `@WebMvcTest`, Repositories mit `@DataJpaTest`;
  Zeit mit `Clock.fixed(...)`.
- **Vor jedem Push laufen alle Tests.** Die GitHub Action veröffentlicht nur bei grünen Tests.

---

## 10. Sicherheit und Geheimnisse

- **Keine Passwörter, Tokens oder Schlüssel** in Code, Tests oder Commits.
  Lokal in `.env` oder `application-local.properties` (beides in `.gitignore`).
- Passwörter nur gehasht (BCrypt über Spring Security).
- SQL nur über JPA oder gebundene Parameter, nie zusammengesetzte Strings.
- Content-Security-Policy in `index.html` nur gezielt erweitern (z. B. `connect-src`
  für die eigene API), nie mit `*` oder `unsafe-inline`.
- Registrierung bleibt geschlossen; Konten nur für eingeladene Freunde.

---

## 11. Git

- Branch `main`. Kleine Schritte direkt auf `main` sind in Ordnung,
  größere Features auf `feat/<name>` und danach zusammenführen.
- Commit-Nachrichten nach **Conventional Commits**, Englisch:
  `feat(entry): add quick entry`, `fix(dates): keep day across DST change`,
  `docs: update backend plan`, `test(calc): cover rounding`.
- Ein Commit = eine zusammengehörige Änderung. Vor dem Commit den Diff auf
  fremde Änderungen prüfen (z. B. versehentliche `.idea`-Dateien).

---

## 12. Regeln für KI-Assistenten 🤖

1. Alle Regeln oben befolgen; diese Datei schlägt eigene Gewohnheiten.
2. **Zuerst das Repo lesen** (0.1). Versionen und Abhängigkeiten aus
   `package.json` / `build.gradle.kts`, nie aus dem Gedächtnis.
   Siehst du nur einen Teil des Projekts, frag nach den Dateien.
3. **Nur Glossar-Namen** verwenden.
4. **Architektur einhalten** (4): keine DOM-Zugriffe in Logik-Modulen, Daten nur
   über den Store, im Backend keine Logik im Controller, keine Entities nach außen.
5. **Keine Abhängigkeiten hinzufügen.** Wenn eine nötig scheint: begründen, nicht einbauen.
6. **Nur ändern, was die Aufgabe braucht.** Kein ungefragtes Umbenennen,
   Umformatieren oder Umbauen.
7. **Tests mitliefern** für jede neue Logik.
8. **Nichts erfinden:** keine Klassen, Funktionen, Endpunkte, die es nicht gibt.
   Fehlt Kontext, nachfragen.
9. Unklare oder widersprüchliche Anforderungen **ansprechen**, nicht still annehmen.
10. Nie Geheimnisse ausgeben oder committen.
11. Am Ende: **Liste der geänderten Dateien** und ob von dieser Datei abgewichen wurde (und warum).

### Vorlage für KI-Chats
```
Halte dich strikt an die angehängte AGENTS.md (Kalorien-Tracker).
Aufgabe: <was getan werden soll>
Betroffene Dateien: <z. B. frontend/js/models.js, frontend/tests/models.test.js>
Relevanter Code: <Dateien einfügen>
Liefern: Code + Tests + Liste der geänderten Dateien.
```

---

## 13. Bewusst nicht übernommen

Diese Teile des Teamprojekts lohnen sich bei einer kleinen App für eine Person
und ein paar Freunde nicht. Eine KI soll sie **nicht** von sich aus einführen.

| Nicht übernommen | Warum |
|---|---|
| Getrennte Domain-Modelle, JPA-Entities und MapStruct-Mapper | dreifacher Code für dieselben Felder; die Entity bleibt im Service, nach außen gehen DTOs |
| Interface + `…Impl` für jeden Service und jedes Repository | es gibt immer nur eine Implementierung; Mockito kann Klassen mocken |
| Vier Schichten als Pakete (`presentation/application/domain/infrastructure`) | bei drei Fachbereichen übersichtlicher nach Bereich gegliedert |
| Audit-Log | `updatedAt` und `deletedAt` reichen |
| Rollen und Berechtigungsstufen | nur zwei Regeln: eigene Daten, eigene Lebensmittel |
| Thymeleaf-Seiten | die App ist eine PWA und muss offline laufen; das Backend liefert nur JSON |
| Pull-Request-Freigaben, Discord-Bot, Branch-Schutz | Ein-Personen-Projekt |
| Abdeckungsziel in Prozent | Regel "jede fachliche Regel hat einen Test" reicht |
| Eigene CSS-Datei pro Seite, Schrift Inter | eine Seite, Systemschrift (offline, keine fremden Server) |
| `BigDecimal` | gilt für Geld; Nährwerte brauchen das nicht |
