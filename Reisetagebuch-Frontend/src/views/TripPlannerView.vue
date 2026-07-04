<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const API = import.meta.env.VITE_APP_BACKEND_BASE_URL
const router = useRouter()

/*Liste aller Reisen, wird vom Backend geladen */
const reisen = ref([])
// Id der Reise, die gerade im Formular bearbeitet wird (null = keine)
const editingId = ref(null)
// Eingabewerte für das Formular "Neue Reise"
const neueReise = ref({
  titel: '',
  reiseziel: '',
  startDatum: '',
  endDatum: '',
  beschreibung: ''
})

// Id der Reise, die gerade aufgeklappt ist (nur eine gleichzeitig möglich)
const expandedId = ref(null)
// geplante Orte der aktuell aufgeklappten Reise
const orte = ref([])
// Referenz auf das Such-Input-Feld für die Ortssuche
const ortSucheInput = ref(null)
// aktuell ausgewählte Kategorie für neue Orte
const ausgewaehlteKategorie = ref('SEHENSWUERDIGKEIT')

// Karten-Objekt, muss nicht reaktiv sein
let karte = null
// aktuelle Marker auf der Karte
let marker = []

// Kategorien mit Label, Icon und Farbe zur Auswahl
const KATEGORIEN = {
  SEHENSWUERDIGKEIT: { label: 'Sehenswürdigkeit', icon: '📍', farbe: '#c9963f' },
  RESTAURANT: { label: 'Restaurant', icon: '🍴', farbe: '#e07a5f' },
  HOTEL: { label: 'Hotel', icon: '🛏️', farbe: '#7a9b5c' },
  SONSTIGES: { label: 'Sonstiges', icon: '⭐', farbe: '#8c8c8c' },
}

// liefert Icon/Label/Farbe zu einer Kategorie, oder "Sonstiges" als Standard
function kategorieInfo(wert) {
  if (KATEGORIEN[wert]) {
    return KATEGORIEN[wert]
  }
  return KATEGORIEN.SONSTIGES
}

// Status-Flags, damit das Google-Maps-Script nur einmal geladen wird
let mapsGeladen = false
let mapsPromise = null

// lädt das Google Maps Script einmalig und wartet auf den Callback von Google
function ladeGoogleMapsScript() {
  if (mapsGeladen) {
    return Promise.resolve()
  }
  if (mapsPromise) {
    return mapsPromise
  }

  mapsPromise = new Promise((resolve, reject) => {
    // Google ruft diese Funktion selbst auf, sobald wirklich alles fertig geladen ist
    window.initGoogleMaps = () => {
      mapsGeladen = true
      resolve()
    }

    const script = document.createElement('script')
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=initGoogleMaps`
    script.async = true
    script.onerror = () => reject(new Error('Google Maps konnte nicht geladen werden'))
    document.head.appendChild(script)
  })

  return mapsPromise
}

// baut die Karte für eine Reise neu auf und setzt alle Marker
function aktualisiereKarte(reiseId) {
  const container = document.getElementById('karte-' + reiseId)
  if (!container) return

  // Kartenmittelpunkt: erster Ort, falls vorhanden, sonst Standardwert
  let center = { lat: 20, lng: 0 }
  if (orte.value.length > 0) {
    center = { lat: orte.value[0].latitude, lng: orte.value[0].longitude }
  }

  // Karte wird bei jedem Auf-/Zuklappen neu gebaut, einfacher als wiederverwenden
  karte = new google.maps.Map(container, {
    center: center,
    zoom: orte.value.length > 0 ? 13 : 2,
  })

  // alte Marker erstmal entfernen
  for (const m of marker) {
    m.setMap(null)
  }
  marker = []

  // für jeden Ort einen neuen Marker mit passendem Icon/Farbe anlegen
  for (const ort of orte.value) {
    const info = kategorieInfo(ort.kategorie)
    const neuerMarker = new google.maps.Marker({
      position: { lat: ort.latitude, lng: ort.longitude },
      map: karte,
      title: info.icon + ' ' + ort.name,
      label: { text: info.icon, fontSize: '14px' },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: info.farbe,
        fillOpacity: 1,
        strokeColor: '#1c140d',
        strokeWeight: 2,
      },
    })
    marker.push(neuerMarker)
  }
}

// richtet die Google-Autocomplete-Suche im Input-Feld ein
function initialisiereAutocomplete(reiseId) {
  if (!ortSucheInput.value) return

  const autocomplete = new google.maps.places.Autocomplete(ortSucheInput.value)
  // wird ausgelöst, wenn der Nutzer einen Vorschlag aus der Liste anklickt
  autocomplete.addListener('place_changed', async () => {
    const place = autocomplete.getPlace()
    if (!place.geometry) return

    try {
      // gewählten Ort mit der aktuell ausgewählten Kategorie ans Backend senden
      await axios.post(API + '/orte', {
        name: place.name,
        ort: place.formatted_address,
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        rating: place.rating || null,
        placeId: place.place_id,
        kategorie: ausgewaehlteKategorie.value,
        reise: { id: reiseId }
      })
      await ladeOrte(reiseId)
      ortSucheInput.value.value = ''
      aktualisiereKarte(reiseId)
    } catch (e) {
      console.error('Fehler beim Speichern des Ortes:', e)
    }
  })
}

// lädt die geplanten Orte einer Reise vom Backend
async function ladeOrte(reiseId) {
  const res = await axios.get(API + '/reisen/' + reiseId + '/orte')
  orte.value = res.data
}

// klappt eine Reise auf oder zu und initialisiert dabei Karte und Suche
async function reiseAufklappen(reise) {
  if (expandedId.value === reise.id) {
    expandedId.value = null
    return
  }

  expandedId.value = reise.id
  ausgewaehlteKategorie.value = 'SEHENSWUERDIGKEIT'

  try {
    await ladeGoogleMapsScript()
    await ladeOrte(reise.id)
  } catch (e) {
    console.error('Fehler beim Laden der Orte:', e)
    orte.value = []
  }

  // warten bis das Input-Feld wirklich im DOM ist
  await wartenBisInputBereit()

  aktualisiereKarte(reise.id)
  initialisiereAutocomplete(reise.id)
}

// wartet so lange, bis das Such-Input-Feld als echtes HTML-Element vorhanden ist
async function wartenBisInputBereit() {
  for (let versuch = 0; versuch < 10; versuch++) {
    await nextTick()
    if (ortSucheInput.value instanceof HTMLInputElement) {
      return
    }
    // kurz warten und nochmal probieren
    await new Promise(resolve => setTimeout(resolve, 30))
  }
}

// löscht einen geplanten Ort und aktualisiert danach Liste und Karte
async function ortLoeschen(reiseId, ortId) {
  try {
    await axios.delete(API + '/orte/' + ortId)
    await ladeOrte(reiseId)
    aktualisiereKarte(reiseId)
  } catch (e) {
    console.error('Fehler beim Löschen des Ortes:', e)
  }
}

// sortiert die Reisen, geplante zuerst, danach nach Startdatum
const sortierteReisen = computed(() => {
  const kopie = [...reisen.value]
  kopie.sort((a, b) => {
    // geplante Reisen zuerst, Entwürfe danach
    if (a.status === 'GEPLANT' && b.status !== 'GEPLANT') return -1
    if (a.status !== 'GEPLANT' && b.status === 'GEPLANT') return 1

    if (!a.startDatum) return 1
    if (!b.startDatum) return -1
    return a.startDatum.localeCompare(b.startDatum)
  })
  return kopie
})

// lädt alle Reisen vom Backend
async function ladeReisen() {
  try {
    const res = await axios.get(API + '/reisen')
    reisen.value = res.data
  } catch (e) {
    console.error('Fehler beim Laden der Reisen:', e)
  }
}

// legt eine neue Reise an oder aktualisiert eine bestehende, je nach Status
async function reiseAnlegen(status) {
  if (!neueReise.value.titel) return

  if (neueReise.value.startDatum && neueReise.value.endDatum) {
    if (neueReise.value.endDatum < neueReise.value.startDatum) {
      window.alert('Das Enddatum darf nicht vor dem Startdatum liegen.')
      return
    }
  }

  try {
    if (editingId.value !== null) {
      await axios.put(API + '/reisen/' + editingId.value, { ...neueReise.value, status: status })
      editingId.value = null
    } else {
      await axios.post(API + '/reisen', { ...neueReise.value, status: status })
    }
    neueReise.value = { titel: '', reiseziel: '', startDatum: '', endDatum: '', beschreibung: '' }
    await ladeReisen()
  } catch (e) {
    console.error('Fehler beim Speichern der Reise:', e)
  }
}

// übernimmt die Werte einer Reise ins Formular zum Bearbeiten
function reiseBearbeitenStarten(reise) {
  editingId.value = reise.id
  neueReise.value = {
    titel: reise.titel || '',
    reiseziel: reise.reiseziel || '',
    startDatum: reise.startDatum || '',
    endDatum: reise.endDatum || '',
    beschreibung: reise.beschreibung || ''
  }
}

// bricht das Bearbeiten ab und leert das Formular
function bearbeitenAbbrechen() {
  editingId.value = null
  neueReise.value = { titel: '', reiseziel: '', startDatum: '', endDatum: '', beschreibung: '' }
}

// löscht eine Reise nach Rückfrage und räumt den restlichen Zustand auf
async function reiseLoeschen(id) {
  if (!window.confirm('Diese Reise wirklich löschen?')) return

  try {
    await axios.delete(API + '/reisen/' + id)
    if (editingId.value === id) {
      bearbeitenAbbrechen()
    }
    if (expandedId.value === id) {
      expandedId.value = null
    }
    await ladeReisen()
  } catch (e) {
    console.error('Fehler beim Löschen der Reise:', e)
  }
}

// formatiert ein Datum kurz im deutschen Format
function kurzDatum(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE')
}

// berechnet den Anzeige-Status einer Reise (Countdown, läuft, abgeschlossen, etc.)
function zeileStatus(reise) {
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
    const tageBisStart = Math.ceil((start - heute) / 86400000)
    return { text: 'in ' + tageBisStart + ' Tag' + (tageBisStart === 1 ? '' : 'en'), klasse: 'countdown' }
  }

  if (heute <= ende) {
    const tagAktuell = Math.floor((heute - start) / 86400000) + 1
    const tagGesamt = Math.floor((ende - start) / 86400000) + 1
    return { text: 'Läuft gerade (Tag ' + tagAktuell + ' von ' + tagGesamt + ')', klasse: 'laeuft' }
  }

  return { text: 'Abgeschlossen', klasse: 'abgeschlossen' }
}

// beim Laden der Seite einmal alle Reisen holen
onMounted(() => {
  ladeReisen()
})
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

            <div v-for="reise in sortierteReisen" :key="reise.id" class="reise-block">
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

                  <div class="orte-spalte">
                    <div class="label-klein">GEPLANTE ORTE</div>

                    <div class="kategorie-auswahl">
                      <button
                        v-for="(info, wert) in KATEGORIEN"
                        :key="wert"
                        :class="['kategorie-chip', { aktiv: ausgewaehlteKategorie === wert }]"
                        :style="ausgewaehlteKategorie === wert ? { borderColor: info.farbe, color: info.farbe } : {}"
                        @click="ausgewaehlteKategorie = wert"
                      >
                        {{ info.icon }} {{ info.label }}
                      </button>
                    </div>

                    <input
                      :ref="(el) => { if (el) ortSucheInput = el }"
                      class="ort-suche-input"
                      type="text"
                      placeholder="Ort hinzufügen…"
                    />

                    <div class="orte-liste">
                      <p v-if="orte.length === 0" class="keine-orte">Noch keine Orte hinzugefügt.</p>
                      <div v-for="ort in orte" :key="ort.id" class="ort-card">
                        <div class="ort-card-info">
                          <span class="ort-card-name">{{ kategorieInfo(ort.kategorie).icon }} {{ ort.name }}</span>
                          <span class="ort-card-meta">
                            {{ ort.ort }}<template v-if="ort.rating"> · ★ {{ ort.rating }}</template>
                          </span>
                          <span class="ort-kategorie-badge" :style="{ background: kategorieInfo(ort.kategorie).farbe }">
                            {{ kategorieInfo(ort.kategorie).label }}
                          </span>
                        </div>
                        <button class="ort-loeschen-btn" @click="ortLoeschen(reise.id, ort.id)" title="Entfernen">✕</button>
                      </div>
                    </div>
                  </div>

                  <div :id="'karte-' + reise.id" class="reise-karte"></div>

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
/* Grundgerüst der gesamten Seite */
.planer {
  width: 100%;
  height: 100%;
  background: #1c140d;
  color: #f0e6d2;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Google Autocomplete Dropdown immer sichtbar über anderen Elementen */
:global(.pac-container) {
  z-index: 9999 !important;
}

.planer-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 32px;
}

.seiten-kopf {
  margin-bottom: 22px;
}

.seiten-titel {
  font-size: 1.3rem;
  font-weight: 700;
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

/* Card-Box, wird mehrfach für Formular und Liste verwendet */
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

.datum-row {
  display: flex;
  gap: 8px;
}

.datum-row .feld-label {
  flex: 1;
}

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
.btn-grau:hover {
  background: #4a3a24;
}

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
.btn-gold:hover {
  background: #e0aa4a;
}

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
.btn-abbrechen:hover {
  color: #f0e6d2;
}

.keine-reisen {
  color: #8a7456;
  font-size: 0.85rem;
  margin: 0;
}

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

.zeile-links {
  flex: 1;
  min-width: 0;
}

.zeile-titel-reihe {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.zeile-titel {
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
}
.zeile-titel:hover {
  color: #c9963f;
}

.status-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 5px;
  flex-shrink: 0;
}

.badge-geplant {
  background: #7a9b5c;
  color: #1c140d;
}

.badge-entwurf {
  background: #6e5d44;
  color: #f0e6d2;
}

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
.reise-zeile:hover .zeile-aktionen {
  opacity: 1;
}

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
.icon-btn:hover {
  background: #312419;
  color: #f0e6d2;
}
.icon-btn.danger:hover {
  background: #4a2418;
  border-color: #6b3424;
  color: #e89878;
}

.countdown {
  color: #c9963f;
  font-weight: 600;
  font-size: 0.82rem;
}

.laeuft {
  color: #7a9b5c;
  font-weight: 600;
  font-size: 0.82rem;
}

.abgeschlossen {
  color: #a89878;
  font-size: 0.82rem;
}

.keine-details {
  color: #a89878;
  font-size: 0.78rem;
}

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

.kategorie-auswahl {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kategorie-chip {
  background: #241b12;
  border: 1px solid #3a2c1c;
  color: #a89878;
  border-radius: 16px;
  padding: 5px 10px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.kategorie-chip:hover {
  border-color: #5a4a30;
}
.kategorie-chip.aktiv {
  background: #2b2014;
  font-weight: 600;
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
  gap: 4px;
  min-width: 0;
}

.ort-card-name {
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

.ort-kategorie-badge {
  display: inline-block;
  width: fit-content;
  color: #1c140d;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
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
.ort-loeschen-btn:hover {
  color: #e89878;
}

.reise-karte {
  min-height: 280px;
  border-radius: 8px;
  border: 1px solid #3a2c1c;
}
</style>
