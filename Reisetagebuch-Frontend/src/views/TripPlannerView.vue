<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const API = import.meta.env.VITE_APP_BACKEND_BASE_URL
const router = useRouter()

// ── Bestehende Reise-Refs ────────────────────────
const reisen = ref<any[]>([])
const editingId = ref<number | null>(null)
const neueReise = ref({
  titel: '',
  reiseziel: '',
  startDatum: '',
  endDatum: '',
  beschreibung: ''
})

// ── Aufklapp-Zustand und Orte ────────────────────
const expandedId = ref<number | null>(null)
const orteByReise = ref<Record<number, any[]>>({})
const kartenByReise: Record<number, any> = {}
const markersByReise: Record<number, any[]> = {}
const ortSucheInputs: Record<number, HTMLInputElement | null> = {}

// ── Google Maps Script (einmalig laden) ──────────
let mapsScriptPromise: Promise<void> | null = null
function ladeGoogleMapsScript(): Promise<void> {
  if (mapsScriptPromise) return mapsScriptPromise
  mapsScriptPromise = new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places) {
      resolve()
      return
    }
    const script = document.createElement('script')
    const key = import.meta.env.VITE_MAPS_KEY
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps konnte nicht geladen werden'))
    document.head.appendChild(script)
  })
  return mapsScriptPromise
}

// ── Karte und Marker ─────────────────────────────
function aktualisiereKarte(reiseId: number) {
  const container = document.getElementById(`karte-${reiseId}`)
  if (!container) return
  const orte = orteByReise.value[reiseId] ?? []
  const center = orte.length > 0
    ? { lat: orte[0].latitude, lng: orte[0].longitude }
    : { lat: 20, lng: 0 }

  if (!kartenByReise[reiseId]) {
    kartenByReise[reiseId] = new (window as any).google.maps.Map(container, {
      center,
      zoom: orte.length > 0 ? 11 : 2,
      mapId: import.meta.env.VITE_MAPS_ID,
    })
  } else {
    if (orte.length > 0) kartenByReise[reiseId].setCenter(center)
  }

  // Alte Marker entfernen
  ;(markersByReise[reiseId] ?? []).forEach((m: any) => m.setMap(null))
  markersByReise[reiseId] = []

  // Neue Marker setzen
  for (const ort of orte) {
    const marker = new (window as any).google.maps.Marker({
      position: { lat: ort.latitude, lng: ort.longitude },
      map: kartenByReise[reiseId],
      title: ort.name,
    })
    markersByReise[reiseId].push(marker)
  }
}

// ── Autocomplete ─────────────────────────────────
function initialisiereAutocomplete(reise: any) {
  const input = ortSucheInputs[reise.id]
  if (!input) return
  const autocomplete = new (window as any).google.maps.places.Autocomplete(input)
  autocomplete.addListener('place_changed', async () => {
    const place = autocomplete.getPlace()
    if (!place.geometry) return
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    try {
      await axios.post(`${API}/orte`, {
        name: place.name,
        ort: place.formatted_address,
        latitude: lat,
        longitude: lng,
        rating: place.rating ?? null,
        placeId: place.place_id,
        reise: { id: reise.id }
      })
      const res = await axios.get(`${API}/reisen/${reise.id}/orte`)
      orteByReise.value[reise.id] = res.data
      input.value = ''
      aktualisiereKarte(reise.id)
    } catch (e) {
      console.error('Fehler beim Speichern des Ortes:', e)
    }
  })
}

// ── Aufklappen / Zuklappen ───────────────────────
async function reiseAufklappen(reise: any) {
  if (expandedId.value === reise.id) {
    expandedId.value = null
    return
  }
  expandedId.value = reise.id
  try {
    await ladeGoogleMapsScript()
    const res = await axios.get(`${API}/reisen/${reise.id}/orte`)
    orteByReise.value[reise.id] = res.data
  } catch (e) {
    console.error('Fehler beim Laden der Orte:', e)
    orteByReise.value[reise.id] = []
  }
  await nextTick()
  aktualisiereKarte(reise.id)
  initialisiereAutocomplete(reise)
}

// ── Ort löschen ──────────────────────────────────
async function ortLoeschen(reiseId: number, ortId: number) {
  try {
    await axios.delete(`${API}/orte/${ortId}`)
    const res = await axios.get(`${API}/reisen/${reiseId}/orte`)
    orteByReise.value[reiseId] = res.data
    aktualisiereKarte(reiseId)
  } catch (e) {
    console.error('Fehler beim Löschen des Ortes:', e)
  }
}

// ── Bestehende Reise-Funktionen ──────────────────
const sortierteReisen = computed(() => {
  return [...reisen.value].sort((a, b) => {
    const statusOrder = (s: string) => (s === 'GEPLANT' ? 0 : 1)
    const statusDiff = statusOrder(a.status) - statusOrder(b.status)
    if (statusDiff !== 0) return statusDiff
    if (!a.startDatum && !b.startDatum) return 0
    if (!a.startDatum) return 1
    if (!b.startDatum) return -1
    return a.startDatum.localeCompare(b.startDatum)
  })
})

async function ladeReisen() {
  try {
    const res = await axios.get(`${API}/reisen`)
    reisen.value = res.data
  } catch (e) {
    console.error('Fehler beim Laden der Reisen:', e)
  }
}

async function reiseAnlegen(status: string) {
  if (!neueReise.value.titel) return
  if (
    neueReise.value.startDatum &&
    neueReise.value.endDatum &&
    neueReise.value.endDatum < neueReise.value.startDatum
  ) {
    window.alert('Das Enddatum darf nicht vor dem Startdatum liegen.')
    return
  }
  try {
    if (editingId.value !== null) {
      await axios.put(`${API}/reisen/${editingId.value}`, { ...neueReise.value, status })
      editingId.value = null
    } else {
      await axios.post(`${API}/reisen`, { ...neueReise.value, status })
    }
    neueReise.value = { titel: '', reiseziel: '', startDatum: '', endDatum: '', beschreibung: '' }
    await ladeReisen()
  } catch (e) {
    console.error('Fehler beim Speichern der Reise:', e)
  }
}

function reiseBearbeitenStarten(reise: any) {
  editingId.value = reise.id
  neueReise.value = {
    titel: reise.titel || '',
    reiseziel: reise.reiseziel || '',
    startDatum: reise.startDatum || '',
    endDatum: reise.endDatum || '',
    beschreibung: reise.beschreibung || ''
  }
}

function bearbeitenAbbrechen() {
  editingId.value = null
  neueReise.value = { titel: '', reiseziel: '', startDatum: '', endDatum: '', beschreibung: '' }
}

async function reiseLoeschen(id: number) {
  if (!window.confirm('Diese Reise wirklich löschen?')) return
  try {
    await axios.delete(`${API}/reisen/${id}`)
    if (editingId.value === id) {
      editingId.value = null
      neueReise.value = { titel: '', reiseziel: '', startDatum: '', endDatum: '', beschreibung: '' }
    }
    if (expandedId.value === id) expandedId.value = null
    await ladeReisen()
  } catch (e) {
    console.error('Fehler beim Löschen der Reise:', e)
  }
}

function kurzDatum(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE')
}

function zeileStatus(reise: any): { text: string; klasse: string } {
  if (reise.status !== 'GEPLANT' || !reise.reiseziel || !reise.startDatum || !reise.endDatum) {
    return { text: 'Details fehlen', klasse: 'keine-details' }
  }
  const heute = new Date()
  heute.setHours(0, 0, 0, 0)
  const start = new Date(reise.startDatum)
  start.setHours(0, 0, 0, 0)
  const ende = new Date(reise.endDatum)
  ende.setHours(0, 0, 0, 0)

  if (heute < start) {
    const diff = Math.ceil((start.getTime() - heute.getTime()) / (1000 * 60 * 60 * 24))
    return { text: `in ${diff} Tag${diff === 1 ? '' : 'en'}`, klasse: 'countdown' }
  }
  if (heute <= ende) {
    const tagY = Math.floor((heute.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const tagZ = Math.floor((ende.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return { text: `Läuft gerade (Tag ${tagY} von ${tagZ})`, klasse: 'laeuft' }
  }
  return { text: 'Abgeschlossen', klasse: 'abgeschlossen' }
}

onMounted(() => { ladeReisen() })
</script>

<template>
  <div class="planer">
    <div class="planer-inner">

      <div class="seiten-kopf">
        <h1 class="seiten-titel">Reise planen</h1>
        <p class="seiten-untertitel">Hier legst du neue Reisen an – auch als Entwurf, wenn noch nicht alles feststeht.</p>
      </div>

      <div class="zwei-spalten">

        <!-- Linke Spalte: Formular -->
        <div>
          <div class="label-klein">{{ editingId ? 'REISE BEARBEITEN' : 'NEUE REISE' }}</div>
          <div class="card">
            <label class="feld-label">
              Titel
              <input class="feld-input" type="text" v-model="neueReise.titel" placeholder="z. B. Sommer in Japan" />
            </label>
            <label class="feld-label">
              Reiseziel
              <input class="feld-input" type="text" v-model="neueReise.reiseziel" placeholder="optional…" />
            </label>
            <div class="datum-row">
              <label class="feld-label">
                Start
                <input class="feld-input" type="date" v-model="neueReise.startDatum" />
              </label>
              <label class="feld-label">
                Ende
                <input class="feld-input" type="date" v-model="neueReise.endDatum" />
              </label>
            </div>
            <label class="feld-label">
              Beschreibung
              <textarea class="feld-input feld-textarea" v-model="neueReise.beschreibung" placeholder="optional…" rows="3"></textarea>
            </label>
            <div class="btn-row">
              <button v-if="editingId === null" class="btn-grau" @click="reiseAnlegen('ENTWURF')">Entwurf speichern</button>
              <button class="btn-gold" @click="reiseAnlegen('GEPLANT')">{{ editingId ? 'Aktualisieren' : 'Anlegen' }}</button>
            </div>
            <button v-if="editingId !== null" class="btn-abbrechen" @click="bearbeitenAbbrechen">Abbrechen</button>
          </div>
        </div>

        <!-- Rechte Spalte: Liste -->
        <div>
          <div class="label-klein">ALLE REISEN</div>
          <div class="card">
            <p v-if="sortierteReisen.length === 0" class="keine-reisen">Noch keine Reisen angelegt.</p>

            <div
              v-for="reise in sortierteReisen"
              :key="reise.id"
              class="reise-block"
            >
              <!-- Reise-Zeile -->
              <div class="reise-zeile">
                <div class="zeile-links">
                  <div class="zeile-titel-reihe">
                    <span
                      class="zeile-titel"
                      @click="router.push({ path: '/reisetagebuch', query: { reiseId: String(reise.id) } })"
                    >{{ reise.titel }}</span>
                    <span :class="['status-badge', reise.status === 'GEPLANT' ? 'badge-geplant' : 'badge-entwurf']">
                      {{ reise.status === 'GEPLANT' ? 'GEPLANT' : 'ENTWURF' }}
                    </span>
                  </div>
                  <div class="zeile-meta">
                    <template v-if="reise.reiseziel || reise.startDatum">
                      {{ reise.reiseziel || '' }}<template v-if="reise.reiseziel && (reise.startDatum || reise.endDatum)"> · </template>{{ kurzDatum(reise.startDatum) }}<template v-if="reise.startDatum && reise.endDatum"> – </template>{{ kurzDatum(reise.endDatum) }}
                    </template>
                    <template v-else>Details fehlen</template>
                  </div>
                </div>
                <div class="zeile-rechts">
                  <span :class="zeileStatus(reise).klasse">{{ zeileStatus(reise).text }}</span>
                  <div class="zeile-aktionen">
                    <button
                      class="icon-btn"
                      @click.stop="reiseAufklappen(reise)"
                      :title="expandedId === reise.id ? 'Zuklappen' : 'Orte anzeigen'"
                    >{{ expandedId === reise.id ? '▴' : '▾' }}</button>
                    <button class="icon-btn" @click="reiseBearbeitenStarten(reise)" title="Bearbeiten">✎</button>
                    <button class="icon-btn danger" @click="reiseLoeschen(reise.id)" title="Löschen">🗑</button>
                  </div>
                </div>
              </div>

              <!-- Aufgeklappter Bereich: Orte + Karte -->
              <div v-if="expandedId === reise.id" class="reise-detail">
                <div class="detail-grid">

                  <!-- Linke Spalte: Ortssuche + Liste -->
                  <div class="orte-spalte">
                    <div class="label-klein">GEPLANTE ORTE</div>
                    <input
                      :ref="(el: any) => { if (el) ortSucheInputs[reise.id] = el }"
                      class="ort-suche-input"
                      type="text"
                      placeholder="Ort hinzufügen…"
                    />
                    <div class="orte-liste">
                      <p v-if="!(orteByReise[reise.id]?.length)" class="keine-orte">Noch keine Orte hinzugefügt.</p>
                      <div
                        v-for="ort in (orteByReise[reise.id] ?? [])"
                        :key="ort.id"
                        class="ort-card"
                      >
                        <div class="ort-card-info">
                          <span class="ort-card-name">📍 {{ ort.name }}</span>
                          <span class="ort-card-meta">
                            {{ ort.ort }}<template v-if="ort.rating"> · ★ {{ ort.rating }}</template>
                          </span>
                        </div>
                        <button class="ort-loeschen-btn" @click="ortLoeschen(reise.id, ort.id)" title="Entfernen">✕</button>
                      </div>
                    </div>
                  </div>

                  <!-- Rechte Spalte: Karte -->
                  <div :id="`karte-${reise.id}`" class="reise-karte"></div>

                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.planer {
  width: 100%;
  height: 100%;
  background: #1c140d;
  color: #f0e6d2;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.planer-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 32px;
}

.seiten-kopf { margin-bottom: 22px; }

.seiten-titel {
  font-size: 1.3rem;
  font-weight: 700;
  color: #f0e6d2;
  margin: 0 0 4px;
}

.seiten-untertitel {
  font-size: 0.82rem;
  color: #a89878;
  margin: 0;
}

.zwei-spalten {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  align-items: start;
}

.label-klein {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #a89878;
  margin-bottom: 6px;
}

.card {
  background: #241b12;
  border: 1px solid #3a2c1c;
  border-radius: 10px;
  padding: 16px;
}

.feld-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 0.78rem;
  color: #a89878;
  margin-bottom: 12px;
}

.feld-input {
  background: #1c140d;
  border: 1px solid #3a2c1c;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f0e6d2;
  font-size: 0.88rem;
  font-family: inherit;
  width: 100%;
}
.feld-input:focus {
  outline: none;
  border-color: #c9963f;
}

.feld-textarea {
  resize: vertical;
  min-height: 72px;
}

.datum-row { display: flex; gap: 8px; }
.datum-row .feld-label { flex: 1; }

.btn-row {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.btn-grau {
  background: #3a2c1c;
  color: #f0e6d2;
  border: none;
  border-radius: 7px;
  padding: 8px 14px;
  font-size: 0.82rem;
  cursor: pointer;
  flex: 1;
}
.btn-grau:hover { background: #4a3a24; }

.btn-gold {
  background: #c9963f;
  color: #1c140d;
  border: none;
  border-radius: 7px;
  padding: 8px 14px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  flex: 1;
}
.btn-gold:hover { background: #e0aa4a; }

.btn-abbrechen {
  background: transparent;
  border: none;
  color: #a89878;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 6px 0 0;
  width: 100%;
  text-align: center;
  text-decoration: underline;
}
.btn-abbrechen:hover { color: #f0e6d2; }

.keine-reisen {
  color: #8a7456;
  font-size: 0.85rem;
  margin: 0;
}

/* Reise-Block (Zeile + optionaler Detail-Bereich) */
.reise-block {
  border-bottom: 1px solid #3a2c1c;
}
.reise-block:last-child {
  border-bottom: none;
}

.reise-zeile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
}

.zeile-links { flex: 1; min-width: 0; }

.zeile-titel-reihe {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.zeile-titel {
  font-weight: 600;
  color: #f0e6d2;
  font-size: 0.92rem;
  cursor: pointer;
}
.zeile-titel:hover { color: #c9963f; }

.status-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 5px;
  flex-shrink: 0;
}

.badge-geplant { background: #7a9b5c; color: #1c140d; }
.badge-entwurf { background: #6e5d44; color: #f0e6d2; }

.zeile-meta {
  color: #a89878;
  font-size: 11px;
  margin-top: 3px;
}

.zeile-rechts {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.zeile-aktionen {
  display: flex;
  gap: 4px;
  opacity: 0.3;
}
.reise-zeile:hover .zeile-aktionen { opacity: 1; }

.icon-btn {
  background: #2b2014;
  border: 1px solid #3a2c1c;
  color: #a89878;
  border-radius: 6px;
  width: 26px;
  height: 26px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.icon-btn:hover { background: #312419; color: #f0e6d2; }
.icon-btn.danger:hover { background: #4a2418; border-color: #6b3424; color: #e89878; }

.countdown { color: #c9963f; font-weight: 600; font-size: 0.82rem; }
.laeuft { color: #7a9b5c; font-weight: 600; font-size: 0.82rem; }
.abgeschlossen { color: #a89878; font-size: 0.82rem; }
.keine-details { color: #a89878; font-size: 0.78rem; }

/* ── Aufgeklappter Bereich ─────────────────────── */
.reise-detail {
  border-top: 1px solid #3a2c1c;
  background: #1c140d;
  margin: 0 -16px;
  padding: 16px 16px 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  align-items: start;
}

.orte-spalte {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ort-suche-input {
  background: #241b12;
  border: 1px solid #3a2c1c;
  border-radius: 6px;
  padding: 8px 10px;
  color: #f0e6d2;
  font-size: 0.85rem;
  font-family: inherit;
  width: 100%;
}
.ort-suche-input:focus {
  outline: none;
  border-color: #c9963f;
}

.orte-liste {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.keine-orte {
  color: #6b5a3e;
  font-size: 0.78rem;
  margin: 0;
}

.ort-card {
  background: #241b12;
  border: 1px solid #3a2c1c;
  border-radius: 7px;
  padding: 9px 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ort-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ort-card-name {
  color: #f0e6d2;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ort-card-meta {
  color: #a89878;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ort-loeschen-btn {
  background: transparent;
  border: none;
  color: #6e5d44;
  cursor: pointer;
  font-size: 0.82rem;
  padding: 2px 4px;
  flex-shrink: 0;
  line-height: 1;
}
.ort-loeschen-btn:hover { color: #e89878; }

.reise-karte {
  min-height: 280px;
  border-radius: 8px;
  border: 1px solid #3a2c1c;
}
</style>
