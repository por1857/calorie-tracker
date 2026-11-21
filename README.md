# Kalorien

iPhone-App (PWA) zum Tracken von Kalorien und Makros.
Nur das Nötigste, kostenlos, Daten bleiben auf dem Handy.
Später mit Java-Backend für Konten und geteilte Lebensmittel.

- Regeln für mich und jede KI: [AGENTS.md](AGENTS.md)
- Aufbau, Datenmodell, Roadmap: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md)
- Design- und UI-Regeln: [docs/STYLEGUIDE.md](docs/STYLEGUIDE.md)
- Plan für das Backend: [docs/BACKEND.md](docs/BACKEND.md)

## Aufbau

| Ordner | Inhalt |
|---|---|
| `frontend/` | die App: HTML, CSS, JavaScript, Tests |
| `backend/` | Phase 2: Spring Boot (noch nicht angelegt) |
| `docs/` | Dokumentation |
| `.github/workflows/` | testet und veröffentlicht automatisch |

## Voraussetzungen

| Programm | Wofür |
|---|---|
| [Node.js](https://nodejs.org) LTS (ab Version 20) | Tests, lokaler Server |
| IntelliJ IDEA | Editor |
| Git | Versionsverwaltung |

## Befehle

Im Ordner `frontend/`:

```bash
npm test     # alle Tests
npm start    # lokaler Server, Adresse steht im Terminal
```

`npm start` zeigt auch eine **Network**-Adresse für das iPhone im selben WLAN.
Mit `?demo` am Ende der Adresse gibt es Beispieldaten.

## Veröffentlichen

Jeder Push auf `main` startet die GitHub Action **Frontend**: Sie führt die
Tests aus und veröffentlicht die App nur, wenn alle grün sind.
Einmalig einrichten: Repo → **Settings → Pages → Source: GitHub Actions**.

Adresse: `https://DEIN-NAME.github.io/kalorien-tracker/`

## Anpassen

- **Name:** `frontend/manifest.webmanifest` (`name`, `short_name`) und
  `frontend/index.html` (`<title>`, `apple-mobile-web-app-title`).
- **Icon:** Vorlage `frontend/icons/icon.svg`, daraus PNGs in 180, 192 und 512 px.
- **Farben, Schrift, Abstände:** nur in `frontend/css/tokens.css`.
