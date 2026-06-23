<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const visitedCountries = ref<string[]>([])
const TOTAL_COUNTRIES = 266
const circumference = 2 * Math.PI * 15

const worldPercent = computed(() =>
  Math.round((visitedCountries.value.length / TOTAL_COUNTRIES) * 100)
)

let map: any = null
let featureLayer: any = null


onMounted(async () => {
  // Google Maps dynamisch laden (Key aus .env)
  console.log('Key:', import.meta.env.VITE_GOOGLE_MAPS_KEY)
  console.log('Map ID:', import.meta.env.VITE_GOOGLE_MAPS_ID)
  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=beta&libraries=places,marker`
  script.async = true
  script.defer = true
  script.onload = () => initMap()
  document.head.appendChild(script)

  // Backend parallel laden
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_APP_BACKEND_BASE_URL}/countries/visited`
    )
    visitedCountries.value = res.data.map((c: any) => c.countryCode)
  } catch (e) {
    console.error('Fehler beim Laden der besuchten Länder:', e)
  }
})

function initMap() {
  const { google } = window as any

  map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
    center: { lat: 20, lng: 10 },
    zoom: 2,
    minZoom: 2,
    maxZoom: 7,
    mapId: import.meta.env.VITE_GOOGLE_MAPS_ID,
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy',
    styles: [
      { elementType: 'geometry.fill', stylers: [{ color: '#e8dcc8' }] },
      { featureType: 'administrative.country',
        elementType: 'geometry.stroke',
        stylers: [{ color: '#a09070' }, { weight: 1 }] },
      { featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#a8c8e8' }] },
      { featureType: 'administrative.country',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#5a4a30' }] },
      { featureType: 'administrative.country',
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#f5f0e8' }, { weight: 2 }] },
      { featureType: 'administrative.locality',
        stylers: [{ visibility: 'off' }] },
      { featureType: 'road', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ],
  })

  try {
    featureLayer = (map as any).getFeatureLayer('COUNTRY')

    featureLayer.addListener('click', async (event: any) => {
      const feature = event.features[0]
      if (!feature) return
      const placeId = feature.placeId
      const name = feature.displayName ?? placeId
      await toggleCountry(placeId, name)
      applyStyles()
    })

    featureLayer.addListener('mousemove', () => {
      ;(map as any).getDiv().style.cursor = 'pointer'
    })

    applyStyles()
  } catch (e) {
    console.warn('Feature Layer nicht verfügbar — Map ID prüfen:', e)
  }
}

function applyStyles() {
  if (!featureLayer) return
  featureLayer.style = (options: any) => {
    const isVisited = visitedCountries.value.includes(options.feature.placeId)
    return {
      fillColor: isVisited ? '#f5a623' : '#d4c9b0',
      fillOpacity: isVisited ? 0.85 : 0.3,
      strokeColor: isVisited ? '#c47a00' : '#a09070',
      strokeWeight: isVisited ? 2 : 0.8,
    }
  }
}

async function toggleCountry(code: string, name: string) {
  if (visitedCountries.value.includes(code)) {
    await axios.delete(
      `${import.meta.env.VITE_APP_BACKEND_BASE_URL}/countries/${code}`
    )
    visitedCountries.value = visitedCountries.value.filter(c => c !== code)
  } else {
    await axios.post(`${import.meta.env.VITE_APP_BACKEND_BASE_URL}/countries`, {
      countryCode: code,
      countryName: name,
    })
    visitedCountries.value.push(code)
  }
}
</script>

<template>
  <div class="home">

    <!-- Header -->
    <header class="topbar">
      <span class="logo">🌍 Reisetagebuch</span>
    </header>

    <!-- Karte -->
    <div id="map" class="map" />

    <!-- Statistik -->
    <section class="stats-panel">
      <div class="stat">
        <span class="stat-value">{{ worldPercent }}%</span>
        <span class="stat-label">Welt</span>
      </div>

      <svg viewBox="0 0 36 36" class="progress-ring" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#d4c9b0" stroke-width="3" />
        <circle
          cx="18" cy="18" r="15"
          fill="none"
          stroke="#f5a623"
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
:global(body) {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

:global(#app) {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
}

.home {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #111;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ── Topbar ──────────────────────────────────────── */
.topbar {
  flex-shrink: 0;
  padding: 12px 20px;
  background: #161616;
  border-bottom: 1px solid #2a2a2a;
}
.logo {
  font-size: 1.2rem;
  font-weight: 700;
  color: #f5a623;
}

/* ── Karte: 60% Breite, zentriert ───────────────── */
#map {
  flex: 1;
  width: 60%;
  margin: 0 auto;
  min-height: 0;
}

/* ── Statistik ───────────────────────────────────── */
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
  color: #f5a623;
  line-height: 1;
}
.stat-label {
  font-size: 0.75rem;
  color: #888;
  margin-top: 4px;
}
.progress-ring { width: 50px; height: 50px; }
.stat-sub {
  width: 100%;
  text-align: center;
  color: #555;
  font-size: 0.72rem;
  margin: 0;
}
</style>
