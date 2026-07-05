# Reisetagebuch - Frontend

Das Reisetagebuch Frontend ist eine Vue 3 Single Page Application, die eine interaktive Weltkarte, eine Reiseverwaltung und ein digitales Reisetagebuch bereitstellt.


---

## Live

| Dienst | URL |
|---|---|
| Frontend (Vue SPA) | https://reisetagebuch-frontend.onrender.com |
| Backend (REST API) | https://reisetagebuch-backend.onrender.com |

---

## Funktionen

**Weltkarte**
- Interaktive Weltkarte mit Leaflet
- Besuchte Länder markieren und entmarkieren
- Tooltip mit Ländername beim Hovern

**Reiseplaner**
- Reisen erstellen, bearbeiten und löschen
- Statusverwaltung: Entwurf, Aktiv, Abgeschlossen
- Routenplanung mit Google Maps Integration

**Tagebuch**
- Tagebucheinträge pro Reise erstellen, bearbeiten und löschen
- Standortangabe und GPS-Koordinaten je Eintrag
- Foto-Upload je Eintrag

---

## Technologien

| Kategorie | Technologie |
|---|---|
| Framework | Vue 3 |

| Karte | Leaflet 1.9 |
| Kartenplanung | Google Maps API |
| Tests | Vitest |
| CI/CD | GitHub Actions |
| Deployment | Render.com |

---

## Lokales Setup

### Voraussetzungen

- Node.js 20 oder höher

### Starten

```bash
git clone <repository-url>
npm install
npm run dev
```

Die App ist unter `http://localhost:5173` erreichbar.

### Tests ausfuehren

```bash
npx vitest run
```

### Umgebungsvariablen

Eine `.env.local` Datei im Wurzelverzeichnis anlegen:
