<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const visitedCountries = ref([] as string[])

// 193 UN-Mitgliedstaaten + 2 Beobachterstaaten (Vatikan, Palästina) = 195.
// Nur Codes aus dieser Liste fließen in die Prozent-/Länderstatistik ein.
// Territorien (Grönland, Puerto Rico, Französisch-Guayana, etc.) sind weiterhin
// auf der Karte anklick- und einfärbbar, zählen aber nicht zu TOTAL_COUNTRIES.
const UN_MEMBER_CODES = new Set([
  'AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ',
  'BS','BH','BD','BB','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','BN','BG','BF','BI',
  'CV','KH','CM','CA','CF','TD','CL','CN','CO','KM','CG','CD','CR','CI','HR','CU','CY','CZ',
  'DK','DJ','DM','DO',
  'EC','EG','SV','GQ','ER','EE','SZ','ET',
  'FJ','FI','FR',
  'GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY',
  'HT','HN','HU',
  'IS','IN','ID','IR','IQ','IE','IL','IT',
  'JM','JP','JO',
  'KZ','KE','KI','KP','KR','KW','KG',
  'LA','LV','LB','LS','LR','LY','LI','LT','LU',
  'MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN','ME','MA','MZ','MM',
  'NA','NR','NP','NL','NZ','NI','NE','NG','MK','NO',
  'OM',
  'PK','PW','PA','PG','PY','PE','PH','PL','PT',
  'QA',
  'RO','RU','RW',
  'KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI','SB','SO','ZA','SS','ES','LK','SD','SR','SE','CH','SY',
  'TJ','TZ','TH','TL','TG','TO','TT','TN','TR','TM','TV',
  'UG','UA','AE','GB','US','UY','UZ',
  'VU','VE','VN',
  'YE','ZM','ZW',
  // Beobachterstaaten
  'VA', 'PS',
])

const TOTAL_COUNTRIES = UN_MEMBER_CODES.size // 195
const circumference = 2 * Math.PI * 15

const visitedUnCountries = computed(() =>
  visitedCountries.value.filter(code => UN_MEMBER_CODES.has(code))
)

const worldPercent = computed(() =>
  Math.round((visitedUnCountries.value.length / TOTAL_COUNTRIES) * 100)
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

// ── Suche ──────────────────────────────────────────

const searchQuery = ref('')
const searchOpen = ref(false)

// Speichert pro Land den Layer, damit die Suche direkt dorthin zoomen kann,
// ohne erneut durch alle Layer iterieren zu müssen.
const countryLayers = new Map<string, L.Layer>()

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Umlaute/Akzente entfernen, z.B. "ä" -> "a"
}

const searchResults = computed(() => {
  const query = normalize(searchQuery.value.trim())
  if (!query) return []
  return Array.from(countryLayers.keys())
    .filter(name => normalize(name).includes(query))
    .sort()
    .slice(0, 8)
})

function selectSearchResult(name: string) {
  const layer = countryLayers.get(name) as L.Path & { getBounds?: () => L.LatLngBounds }
  if (!layer) return

  const bounds = (layer as any).getBounds?.()
  if (bounds) {
    map?.fitBounds(bounds, { maxZoom: 5, padding: [40, 40] })
  }

  // Kurzes visuelles Hervorheben, damit man das gefundene Land sofort erkennt
  ;(layer as any).setStyle?.({ weight: 4, color: '#c9963f' })
  ;(layer as any).bringToFront?.()
  setTimeout(() => {
    const iso = resolveIsoCode((layer as any).feature)
    ;(layer as any).setStyle?.(getStyle(iso))
  }, 1500)

  ;(layer as any).openTooltip?.()
  setTimeout(() => (layer as any).closeTooltip?.(), 1500)

  searchQuery.value = ''
  searchOpen.value = false
}

function fitMapToContainer() {
  if (!map) return
  map.invalidateSize()
  map.fitBounds([[-82, -145], [80, 165]], { padding: [10, 10] })
}

onUnmounted(() => window.removeEventListener('resize', fitMapToContainer))

onMounted(async () => {
  map = L.map('map', {
    center: [20, 10],
    zoom: 2,
    minZoom: 2,
    maxZoom: 7,
    zoomControl: true,
    zoomSnap: 0,
    zoomDelta: 0.5,
    worldCopyJump: false,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0,
  })

  requestAnimationFrame(() => {
    fitMapToContainer()
  })

  window.addEventListener('resize', fitMapToContainer)

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
  countryLayers.clear()

  geojsonLayer = L.geoJSON(geojson, {
    style: (feature) => getStyle(resolveIsoCode(feature)),
    onEachFeature: (feature, layer) => {
      const isoCode = resolveIsoCode(feature)
      const name = feature.properties.name

      countryLayers.set(name, layer)

      layer.on({
        click: () => handleCountryClick(isoCode, name),
        mouseover: (e) => {
          e.target.setStyle({ fillOpacity: 0.95, weight: 2.5 })
          e.target.bringToFront()
        },
        mouseout: (e) => {
          e.target.setStyle(getStyle(isoCode))
        }
      })
      layer.bindTooltip(name, {
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
    fillColor: isVisited ? '#7a9b5c' : '#c8d6e5',
    fillOpacity: isVisited ? 0.85 : 0.4,
    color: isVisited ? '#5a7a3f' : '#7f8c8d',
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
  <div class="map-wrapper">
    <div id="map" class="map" />

    <div class="search-box">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Land suchen…"
        class="search-input"
        @focus="searchOpen = true"
      />
      <ul v-if="searchOpen && searchResults.length" class="search-results">
        <li
          v-for="name in searchResults"
          :key="name"
          @click="selectSearchResult(name)"
        >
          {{ name }}
        </li>
      </ul>
    </div>

    <!-- Freistehende Stats-Karte, schwebt über der Karte am unteren Rand -->
    <section class="stats-card">
      <div class="stat">
        <span class="stat-value">{{ worldPercent }}%</span>
        <span class="stat-label">World</span>
      </div>

      <svg viewBox="0 0 36 36" class="progress-ring" aria-hidden="true">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#4a3c28" stroke-width="3" />
        <circle
          cx="18" cy="18" r="15"
          fill="none"
          stroke="#c9963f"
          stroke-width="3"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="circumference - (circumference * worldPercent / 100)"
          transform="rotate(-90 18 18)"
          style="transition: stroke-dashoffset 0.6s ease"
        />
      </svg>

      <div class="stat">
        <span class="stat-value">{{ visitedUnCountries.length }}</span>
        <span class="stat-label">Countries</span>
      </div>

      <p class="stat-sub">Out of {{ TOTAL_COUNTRIES }} Countries (UN Member States)</p>
    </section>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background: #1c140d;
}

#map {
  width: 100%;
  height: 100%;
  background: #1c140d;
}
.search-box {
  position: absolute;
  top: 12px;
  left: 60px;
  z-index: 1000;
  width: 240px;
}

.search-input {
  width: 100%;
  padding: 9px 14px;
  border-radius: 8px;
  border: 1px solid #3a2c1c;
  background: rgba(36, 27, 18, 0.95);
  color: #f0e6d2;
  font-size: 0.9rem;
  outline: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}
.search-input::placeholder { color: #a89878; }
.search-input:focus { border-color: #c9963f; }

.search-results {
  list-style: none;
  margin: 6px 0 0;
  padding: 4px;
  background: rgba(36, 27, 18, 0.97);
  border: 1px solid #3a2c1c;
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}
.search-results li {
  padding: 8px 10px;
  border-radius: 6px;
  color: #e0d4ba;
  font-size: 0.88rem;
  cursor: pointer;
}
.search-results li:hover {
  background: #c9963f;
  color: #1c140d;
}

/* Freistehende Stats-Karte über der Karte, im Stil des Referenzdesigns:
   abgerundet, mit Schatten, schwebend statt volle Bildschirmbreite */
.stats-card {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: min(92%, 480px);
  background: rgba(36, 27, 18, 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid #3a2c1c;
  border-radius: 20px;
  padding: 18px 28px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  color: #f0e6d2;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
.stat { text-align: center; min-width: 64px; }
.stat-value {
  display: block;
  font-size: 1.7rem;
  font-weight: 800;
  color: #c9963f;
  line-height: 1;
}
.stat-label {
  font-size: 0.7rem;
  color: #a89878;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.progress-ring { width: 46px; height: 46px; flex-shrink: 0; }
.stat-sub {
  width: 100%;
  text-align: center;
  color: #8a7456;
  font-size: 0.7rem;
  margin: 8px 0 0;
}

:global(.country-tooltip) {
  background: rgba(36, 27, 18, 0.92) !important;
  border: 1px solid #c9963f !important;
  color: #c9963f !important;
  font-weight: 800 !important;
  font-size: 1.15rem !important;
  border-radius: 6px !important;
  padding: 6px 14px !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
}
:global(.country-tooltip::before) { display: none !important; }
</style>
