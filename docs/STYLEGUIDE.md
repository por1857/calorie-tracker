# Styleguide

Regeln für Aussehen, Texte und Code der App. Die Werte selbst stehen in
`css/tokens.css`, eine Live-Vorschau aller Bausteine in `styleguide.html`.
Alle Pfade in diesem Dokument liegen im Ordner `frontend/`.

## Idee

Die App ist ein Rechner fürs Essen, also sieht sie aus wie eine
Küchenwaage: Ein dunkles **Anzeigefeld** mit großen runden Ziffern zeigt,
was heute noch übrig ist. Das ist das einzige auffällige Element.
Alles andere bleibt ruhig, damit ein Eintrag in wenigen Sekunden erledigt ist.

**Drei Grundsätze**

1. **Schnell vor schön.** Jeder Eintrag in höchstens drei Taps.
2. **Zahlen zuerst.** Werte groß, Beschriftungen klein und grau.
3. **Eine Farbe, eine Bedeutung.** Blau ist immer Protein, nie etwas anderes.

## Farben

| Token | Hell | Wofür |
|---|---|---|
| `--color-paper` | `#EEF1F0` | Seitenhintergrund |
| `--color-surface` | `#FFFFFF` | Eingabefelder |
| `--color-ink` | `#18232B` | Text, primäre Buttons |
| `--color-muted` | `#56656D` | Nebentext, Einheiten |
| `--color-line` | `#D3DADA` | Trennlinien |
| `--color-kcal` | `#1E8A5A` | Kalorien, Fortschritt |
| `--color-protein` | `#2F6FD6` | Protein |
| `--color-carbs` | `#C9850C` | Kohlenhydrate |
| `--color-fat` | `#B8407F` | Fett |
| `--color-danger` | `#C62D1F` | Ziel überschritten, Löschen, Fehler |

- Jede Farbe hat eine Dunkelmodus-Variante in `tokens.css`. Neue Farben
  immer an **beiden** Stellen eintragen.
- Makro-Farben nur für Punkte und Balken, **nie für Fließtext** (zu wenig Kontrast).
- Text braucht mindestens 4,5 : 1 Kontrast zum Hintergrund. Prüfen mit
  [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/).
- Bedeutung nie nur über Farbe: "Über dem Ziel" steht zusätzlich als Text da.

## Schrift

- **Eine Familie:** `ui-rounded` (SF Pro Rounded auf dem iPhone).
  Keine Webfonts: läuft offline und lädt nichts von fremden Servern.
- **Größen** nur aus den Tokens `--text-xs` bis `--text-display`.
- **Zahlen** bekommen die Klasse `num` (gleich breite Ziffern, nichts springt).
- **Eingabefelder** mindestens 16 px, sonst zoomt Safari beim Antippen hinein.

## Abstände und Formen

- Abstände nur aus dem 4er-Raster `--space-1` (4 px) bis `--space-7` (48 px).
- Seitenrand: `--space-4` (16 px).
- Rundungen nach Wichtigkeit: Balken 8 px, Felder 12 px, Anzeigefeld 22 px,
  Buttons ganz rund.
- Alles Antippbare mindestens **44 × 44 px** (Apple-Vorgabe).
- Keine Karten-Optik mit Schatten für Listen. Mahlzeiten werden mit
  Trennlinien gegliedert. Schatten nur für Schwebendes (Plus-Knopf).

## Bausteine

| Klasse | Wofür |
|---|---|
| `.readout` | Anzeigefeld, Variante `--over` bei Überschreitung |
| `.meter` | Fortschrittsbalken, Füllung über `--fill` (0 bis 1) |
| `.macros`, `.macro` | Makro-Übersicht in drei Spalten |
| `.meal`, `.entry` | Mahlzeit mit ihren Einträgen |
| `.button` | `--primary`, `--secondary`, `--danger`, `--block` |
| `.icon-button` | runder Knopf nur mit Symbol (braucht `aria-label`) |
| `.fab` | schwebender Plus-Knopf |
| `.field` | Label + Eingabe + Hinweis/Fehler, Variante `--invalid` |
| `.tabbar` | Tab-Leiste unten |
| `.toast` | kurze Rückmeldung |

Benennung nach **BEM**: `.block`, `.block__teil`, `.block--variante`.

## Texte in der App

- **Sprache:** Deutsch (Österreich): "Jänner", "1 240 kcal", "12,5 g".
- **Groß-/Kleinschreibung** wie im normalen Satz, keine GROSSBUCHSTABEN.
- **Buttons sagen, was passiert:** "Eintragen", "Speichern", "Löschen",
  nicht "OK" oder "Absenden". Dasselbe Wort auch in der Rückmeldung:
  Button "Löschen" → Toast "Gelöscht".
- **Leere Bereiche** sagen, was zu tun ist: "Noch nichts eingetragen."
- **Fehler** sagen, wie man es richtig macht: "Gib eine Zahl ein, zum Beispiel 372."
- **Einheiten:** `kcal` und `g`, immer mit Leerzeichen davor.

## Eingaben

- Zahlenfelder: `type="text" inputmode="decimal"`. Das öffnet am iPhone die
  Zahlentastatur **mit Komma**. (`type="number"` macht auf iOS Probleme mit Komma.)
- Eingaben immer über `parseAmount()` aus `js/calc.js` lesen.

## Code

- **Bezeichner auf Englisch** (`dayKey`, `sumNutrients`), **Kommentare und
  Texte in der App auf Deutsch**.
- Dateinamen klein mit Bindestrich: `food-list.js`.
- Text ins HTML **immer mit `textContent`**, nie mit `innerHTML` (Sicherheit).
- Rechnen nur in `calc.js`, Datum nur in `dates.js`, Anzeigeformat nur in
  `format.js`, Datensätze erzeugen und prüfen nur in `models.js`.
  Jede neue Funktion dort bekommt einen Test.
- Daten lesen und schreiben **nur über den Store** (`js/storage/`), nie
  direkt mit IndexedDB oder `fetch` aus `app.js`.
- Datensätze nie von Hand bauen (`{ id: …, name: … }`), immer über
  `createFood`, `createEntryFromFood` usw. Dann stimmen id und Zeitstempel.
- Gerundet wird nur bei der Anzeige, gespeichert wird ungerundet.
- Keine festen Farben oder Pixelwerte in CSS-Bausteinen, immer Tokens.

## Checkliste vor dem Commit

Übernommen aus dem UI-Guide des Teamprojekts, angepasst an diese App.

- [ ] Farben, Abstände und Schrift kommen aus `tokens.css`, keine festen Werte.
- [ ] Bestehende Bausteine wiederverwendet; neue Bausteine in `components.css`
      und in `styleguide.html` ergänzt.
- [ ] Auch per JavaScript erzeugte Elemente haben die gemeinsamen Klassen.
- [ ] Stylesheets in der Reihenfolge `tokens` → `base` → `components` geladen.
- [ ] Am Handy geprüft (375 px Breite), hell **und** dunkel.
- [ ] Kein seitliches Scrollen der ganzen Seite.
- [ ] Alle Knöpfe, Eingaben und Fehlermeldungen einmal von Hand ausprobiert.
- [ ] `npm test` grün. Für Optik reicht das nicht: immer auch ansehen.

## Pflege

- Soll eine Änderung überall wirken, gehört sie in `tokens.css` oder
  `components.css`, nicht an eine einzelne Stelle.
- Nach einer Änderung an einem Baustein `styleguide.html` öffnen und prüfen,
  ob alle Varianten noch stimmen.
- Keine breiten Resets innerhalb von Bausteinen (z. B. alle Abstände aller
  Kinder auf 0), die überschreiben sonst die gemeinsamen Stile.
