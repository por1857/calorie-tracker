# Phase 2: Backend für Freunde

> **Plan, noch nicht umgesetzt.** Beginnt, wenn die App (Phase 1) im Alltag läuft.
> Regeln für den Code: `AGENTS.md`, Abschnitte 4.2, 7, 8.

## Ziel

- Jeder Freund hat ein **eigenes Konto**.
- **Lebensmittel sind geteilt**, ändern darf nur, wer sie angelegt hat.
- **Einträge und Ziele sind privat.**
- Erreichbar von überall, **rund um die Uhr**.
- Die App bleibt **offline nutzbar**: Sie speichert zuerst am iPhone und
  gleicht ab, sobald Netz da ist.

## Aufbau

```
iPhone (PWA, IndexedDB)
        │  HTTPS, eigene Domain
        ▼
Server ─ Caddy ───────────── /        → App-Dateien (frontend/)
          │                  /api/*   → Spring Boot (Port 8080, nur intern)
          │                                   │
          └───────────────────────────────── PostgreSQL (nur intern)
```

**Warum App und API unter derselben Adresse?** Safari blockiert Cookies von
fremden Adressen. Liegt die API unter einer anderen Domain als die App, funktioniert
die Anmeldung per Cookie nicht. Unter derselben Domain gibt es dieses Problem
nicht, und auch kein CORS. Caddy holt dabei automatisch das HTTPS-Zertifikat.

Alle drei Teile laufen mit **Docker Compose** auf einem kleinen Server.

## Hosting (Stand November 2026)

| Option | Kosten | Bewertung |
|---|---|---|
| **Hetzner Cloud CX23** (2 vCPU, 4 GB RAM, 40 GB, Deutschland/Finnland) | 5,99 € im Monat zzgl. USt | **Empfehlung:** planbar, in der EU, reicht für Spring Boot und PostgreSQL |
| Oracle Cloud "Always Free" (Ampere, bis 2 OCPU und 12 GB RAM) | 0 € | möglich, aber Oracle hat die Gratis-Grenzen im Juni 2026 ohne Ankündigung halbiert |
| Render (Gratis-Stufe) | 0 € | schläft nach 15 Minuten ein, Gratis-Datenbank läuft nach 30 Tagen ab: ungeeignet |
| Eigener PC zuhause | Strom | nicht rund um die Uhr, Freigaben im Router nötig: ungeeignet |

Dazu kommt eine **eigene Domain** (je nach Endung einige Euro im Jahr).
Vor dem Kauf aktuelle Preise und Verfügbarkeit prüfen. Mit dem GitHub
Student Developer Pack gibt es teils Cloud-Guthaben; lohnt einen Blick.

Quellen: [Hetzner Cloud](https://www.hetzner.com/cloud/cost-optimized),
[InfoQ zu Oracle Free Tier](https://infoq.com/news/2026/07/oracle-cloud-free-tier-limits/),
[Render Free Tier](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026.md)

## Backend anlegen

Auf [start.spring.io](https://start.spring.io):

| Feld | Wert |
|---|---|
| Project | Gradle - Kotlin |
| Language | Java |
| Spring Boot | neueste stabile Version (ohne SNAPSHOT oder M) |
| Group | `at.<dein-kürzel>` |
| Artifact / Name | `backend` |
| Package name | `at.<dein-kürzel>.kalorien` |
| Packaging | Jar |
| Java | die Version, die du installiert hast (Teamprojekt: 25) |

**Dependencies:** Spring Web, Spring Data JPA, PostgreSQL Driver,
Flyway Migration, Validation, Spring Security, H2 Database.

ZIP entpacken, Inhalt nach `backend/` im Repo. Danach Root-Package in
`AGENTS.md` (Abschnitt 4.2) eintragen und Versionen in Abschnitt 0.2 prüfen.

## API

Alle Pfade unter `/api/v1`, Antworten als JSON-DTOs.

| Methode | Pfad | Wofür | Wer |
|---|---|---|---|
| POST | `/auth/register` | Konto anlegen, nur mit Einladungscode | alle |
| POST | `/auth/login` | anmelden, setzt Sitzungs-Cookie | alle |
| POST | `/auth/logout` | abmelden | angemeldet |
| GET | `/me` | eigenes Konto | angemeldet |
| GET | `/foods?updatedSince=` | geänderte Lebensmittel, inkl. gelöschter | angemeldet |
| PUT | `/foods/{id}` | anlegen oder ändern | nur Ersteller ändert |
| DELETE | `/foods/{id}` | weich löschen | nur Ersteller |
| GET | `/entries?updatedSince=` | eigene geänderte Einträge | angemeldet |
| PUT | `/entries/{id}` | anlegen oder ändern | nur eigene |
| DELETE | `/entries/{id}` | weich löschen | nur eigene |
| GET / PUT | `/goals` | eigene Ziele | angemeldet |

**PUT mit der ID vom Gerät** legt an oder ändert. Kommt dieselbe Anfrage zweimal
(z. B. nach Funkloch), entsteht kein Doppel.

## Abgleich

1. Jede Änderung wird **zuerst am iPhone** gespeichert und als "offen" markiert.
2. Mit Netz: offene Änderungen per `PUT`/`DELETE` hochladen.
3. Dann alles holen, was sich seit dem letzten Abgleich geändert hat (`updatedSince`).
4. Gibt es einen Datensatz zweimal, **gewinnt der neuere `updatedAt`**.

Umgesetzt als `frontend/js/storage/sync-store.js`, das den Vertragstest besteht.

## Datenbank (Entwurf für `V1__baseline.sql`)

```sql
create table app_user (
    id            uuid primary key,
    email         varchar(254) not null unique,
    display_name  varchar(40)  not null,
    password_hash varchar(100) not null,
    created_at    timestamptz  not null
);

create table food (
    id            uuid primary key,
    name          varchar(80)      not null,
    kcal          double precision not null check (kcal between 0 and 900),
    protein       double precision not null default 0 check (protein >= 0),
    carbs         double precision not null default 0 check (carbs >= 0),
    fat           double precision not null default 0 check (fat >= 0),
    default_grams double precision check (default_grams > 0),
    created_by    uuid references app_user (id) on delete set null,
    created_at    timestamptz not null,
    updated_at    timestamptz not null,
    deleted_at    timestamptz
);
create index food_updated_at on food (updated_at);

create table entry (
    id         uuid primary key,
    user_id    uuid        not null references app_user (id) on delete cascade,
    day_key    date        not null,
    meal       varchar(10) not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
    food_id    uuid references food (id),
    name       varchar(80) not null,
    grams      double precision check (grams > 0),
    kcal       double precision not null default 0,
    protein    double precision not null default 0,
    carbs      double precision not null default 0,
    fat        double precision not null default 0,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    deleted_at timestamptz
);
create index entry_user_updated on entry (user_id, updated_at);

create table goals (
    user_id    uuid primary key references app_user (id) on delete cascade,
    kcal       double precision not null,
    protein    double precision not null,
    carbs      double precision not null,
    fat        double precision not null,
    updated_at timestamptz not null
);
```

Zeitstempel setzt der Server über die injizierte `Clock`, nicht die Datenbank.

## Sicherheit

- Spring Security mit **Sitzungs-Cookie** (`HttpOnly`, `Secure`, `SameSite=Lax`)
  und eingeschaltetem **CSRF-Schutz** (Token im Header).
- Passwörter mit BCrypt.
- **Registrierung nur mit Einladungscode** aus einer Umgebungsvariable
  (`INVITE_CODE`), damit sich keine Fremden anmelden.
- Datenbank und Port 8080 sind von außen **nicht** erreichbar, nur Caddy (443).
- Geheimnisse (DB-Passwort, Einladungscode) nur in `.env` auf dem Server.
- Die Content-Security-Policy in `index.html` bleibt, wie sie ist:
  Die API liegt unter derselben Adresse, `connect-src 'self'` erlaubt sie schon.

## Datenschutz

Essensdaten können als Gesundheitsdaten gelten. Server in der EU, nur speichern,
was die App braucht, Freunden sagen, was gespeichert wird, Konto löschen
ermöglichen (Einträge und Ziele werden mitgelöscht, geteilte Lebensmittel bleiben
ohne Ersteller). Keine Rechtsberatung, sondern eine vernünftige Grundhaltung.

## Umzug von GitHub Pages auf die eigene Domain

Daten in IndexedDB gehören zur Adresse der App. Beim Wechsel von
`…github.io` auf die eigene Domain sind sie dort nicht sichtbar. Darum vorher
**Export** (Schritt 7), in der neuen App **Import**, danach erster Abgleich.
Das Icon am Home-Bildschirm einmal neu hinzufügen.

## Umsetzungsschritte

- [ ] Backend auf start.spring.io anlegen, nach `backend/`, `gradlew test` grün
- [ ] `V1__baseline.sql`, Entities, Repositories
- [ ] Konten: Registrierung mit Einladungscode, Anmeldung, Sitzung
- [ ] API für Lebensmittel, Einträge, Ziele, mit Berechtigungstests
- [ ] `sync-store.js` in der App, besteht den Vertragstest
- [ ] Server mieten, Domain, Docker Compose mit Caddy, Spring Boot, PostgreSQL
- [ ] GitHub Action: Backend testen und ausliefern
- [ ] Umzug der eigenen Daten, Freunde einladen
