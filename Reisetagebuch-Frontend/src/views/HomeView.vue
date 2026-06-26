<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const visitedCountries = ref([] as string[])
const TOTAL_COUNTRIES = 266
const circumference = 2 * Math.PI * 15

const worldPercent = computed(() =>
  Math.round((visitedCountries.value.length / TOTAL_COUNTRIES) * 100)
)

let map: L.Map | null = null
let geojsonLayer: L.GeoJSON | null = null

// Manche Länder haben in diesem GeoJSON-Datensatz "-99" statt eines echten
// ISO-Codes (bekanntes Problem bei Natural-Earth-Daten, z.B. Frankreich, Norwegen).
// Hier können bei Bedarf weitere Länder ergänzt werden, falls sie ebenfalls
// übersprungen werden.
const ISO_FIXES: Record<string, string> = {
  France: 'FR',
  Norway: 'NO',
}

function resolveIsoCode(feature: any): string {
  const raw = feature?.properties?.['ISO3166-1-Alpha-2']
  if (raw && raw !== '-99') return raw
  return ISO_FIXES[feature?.properties?.name] ?? raw
}

onMounted(async () => {
  map = L.map('map', {
    center: [20, 10],
    zoom: 2,
    minZoom: 2,
    maxZoom: 7,
    zoomControl: true,
    worldCopyJump: false,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    noWrap: true,
  }).addTo(map)

  requestAnimationFrame(() => {
    map?.invalidateSize()
    map?.fitBounds([[-75, -145], [80, 165]])
  })

  try {
    const res = await axios.get(
      `${import.meta.env.VITE_APP_BACKEND_BASE_URL}/countries/visited`
    )
    visitedCountries.value = res.data.map((c: any) => c.countryCode)
  } catch (e) {
    console.error('Fehler beim Laden der besuchten Länder:', e)
  }

  await loadCountries()
})

async function loadCountries() {
  const res = await fetch(
    'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
  )
  const geojson = await res.json()

  if (geojsonLayer) geojsonLayer.remove()

  geojsonLayer = L.geoJSON(geojson, {
    style: (feature) => getStyle(resolveIsoCode(feature)),
    onEachFeature: (feature, layer) => {
      const isoCode = resolveIsoCode(feature)
      layer.on({
        click: () => handleCountryClick(isoCode, feature.properties.name),
        mouseover: (e) => {
          e.target.setStyle({ fillOpacity: 0.95, weight: 2.5 })
          e.target.bringToFront()
        },
        mouseout: (e) => {
          e.target.setStyle(getStyle(isoCode))
        }
      })
      layer.bindTooltip(feature.properties.name, {
        sticky: true,
        className: 'country-tooltip',
        direction: 'top',
      })
    }
  }).addTo(map!)
}

function getStyle(isoCode: string) {
  const isVisited = visitedCountries.value.includes(isoCode)
  return {
    fillColor: isVisited ? '#27ae60' : '#c8d6e5',
    fillOpacity: isVisited ? 0.85 : 0.4,
    color: isVisited ? '#1e8449' : '#7f8c8d',
    weight: isVisited ? 2 : 0.6,
  }
}

async function handleCountryClick(isoCode: string, name: string) {
  if (!isoCode || isoCode === '-99') {
    console.warn('Land ohne gültigen ISO-Code übersprungen:', name)
    return
  }
  await toggleCountry(isoCode, name)
  geojsonLayer?.eachLayer((layer: any) => {
    const iso = resolveIsoCode(layer.feature)
    if (iso) layer.setStyle(getStyle(iso))
  })
}

async function toggleCountry(isoCode: string, name: string) {
  try {
    if (visitedCountries.value.includes(isoCode)) {
      await axios.delete(
        `${import.meta.env.VITE_APP_BACKEND_BASE_URL}/countries/${isoCode}`
      )
      visitedCountries.value = visitedCountries.value.filter(c => c !== isoCode)
    } else {
      await axios.post(`${import.meta.env.VITE_APP_BACKEND_BASE_URL}/countries`, {
        countryCode: isoCode,
        country: name,
      })
      visitedCountries.value.push(isoCode)
    }
  } catch (e) {
    console.error('Fehler beim Speichern:', e)
  }
}
</script>

<template>
  <div class="home">
    <header class="topbar">
      <span class="logo">🌍 Reisetagebuch</span>
    </header>

    <div id="map" class="map" />

    <section class="stats-panel">
      <div class="stat">
        <span class="stat-value">{{ worldPercent }}%</span>
        <span class="stat-label">Welt bereist</span>
      </div>

      <svg viewBox="0 0 36 36" class="progress-ring" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#2a2a2a" stroke-width="3" />
        <circle
          cx="18" cy="18" r="15"
          fill="none"
          stroke="#27ae60"
          stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="circumference - (circumference * worldPercent / 100)"
          transform="rotate(-90 18 18)"
          style="transition: stroke-dashoffset 0.6s ease"
        />
      </svg>

      <div class="stat">
        <span class="stat-value">{{ visitedCountries.length }}</span>
        <span class="stat-label">Länder</span>
      </div>

      <p class="stat-sub">von {{ TOTAL_COUNTRIES }} Ländern und Territorien</p>
    </section>
  </div>
</template>

<style scoped>
:global(body) { margin: 0; padding: 0; overflow: hidden; }
:global(#app) { width: 100vw; height: 100vh; margin: 0; padding: 0; }

.home {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #111;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.topbar {
  flex-shrink: 0;
  padding: 12px 20px;
  background: #161616;
  border-bottom: 1px solid #2a2a2a;
}
.logo { font-size: 1.2rem; font-weight: 700; color: #27ae60; }

#map {
  flex: 1;
  width: 100%;
  min-height: 0;
}

.stats-panel {
  flex-shrink: 0;
  background: #1a1a1a;
  border-top: 1px solid #2a2a2a;
  padding: 14px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  color: white;
  min-height: 80px;
}
.stat { text-align: center; }
.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 800;
  color: #27ae60;
  line-height: 1;
}
.stat-label { font-size: 0.75rem; color: #888; margin-top: 4px; }
.progress-ring { width: 50px; height: 50px; }
.stat-sub {
  width: 100%;
  text-align: center;
  color: #555;
  font-size: 0.72rem;
  margin: 0;
}

:global(.country-tooltip) {
  background: rgba(22, 22, 22, 0.92) !important;
  border: 1px solid #27ae60 !important;
  color: #27ae60 !important;
  font-weight: 800 !important;
  font-size: 1.15rem !important;
  border-radius: 6px !important;
  padding: 6px 14px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
}
:global(.country-tooltip::before) { display: none !important; }
</style>
