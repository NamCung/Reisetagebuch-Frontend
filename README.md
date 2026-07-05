# Reisetagebuch - Frontend

Das Reisetagebuch Frontend ist eine Vue 3 Single Page Application, die eine interaktive Weltkarte, eine Reiseverwaltung und ein digitales Reisetagebuch bereitstellt.

Das Projekt wurde im Rahmen des Moduls Webtechnologien an der HTW Berlin entwickelt.

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

### Tests ausführen

```bash
npx vitest run
```

### Umgebungsvariablen

Eine `.env.local` Datei im Wurzelverzeichnis anlegen:

```
VITE_APP_BACKEND_BASE_URL=http://localhost:8080
VITE_GOOGLE_MAPS_KEY=your-google-maps-key
```

---

## Projektstruktur

```
src/
├── components/
│   ├── __tests__/
│   ├── ActionButtons.vue
│   ├── FotoUpload.vue
│   ├── TravelStats.vue
│   └── WorldMap.vue
├── views/
│   ├── HomeView.vue
│   ├── DiaryView.vue
│   ├── TripPlannerView.vue
│   └── AboutView.vue
├── router/
│   └── index.ts
├── App.vue
└── main.ts
```

---

## Entwickler

Entwickelt von Luis Duc Nam Cung und Vu Thang Bui

HTW Berlin - Projekt Webtechnologien 2026
