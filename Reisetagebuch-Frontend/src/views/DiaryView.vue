<script setup>
import { ref, onMounted, nextTick } from 'vue'  // nextTick NEU
import { RouterLink, useRoute } from 'vue-router'
import axios from 'axios'
import FotoUpload from '../components/FotoUpload.vue'

const API = import.meta.env.VITE_APP_BACKEND_BASE_URL
const route = useRoute()

const reisen = ref([])
const selectedReiseId = ref(null)
const selectedReise = ref(null)

const entries = ref([])

const openEntry = ref(null)
const isEditingEntry = ref(false)
const isNewEntry = ref(false)

// Refs auf die DOM-Elemente für contenteditable
const textElement = ref(null)
const ortElement = ref(null)

const entryDatum = ref('')
const entryError = ref('')

onMounted(async () => {
  await ladeReisen()
  const reiseIdParam = route.query.reiseId
  if (reiseIdParam) {
    const zielReise = reisen.value.find(r => r.id == Number(reiseIdParam))
    if (zielReise) await waehleReise(zielReise)
  }
})

async function ladeReisen() {
  try {
    const res = await axios.get(`${API}/reisen`)
    reisen.value = res.data
    if (reisen.value.length > 0) waehleReise(reisen.value[0])
  } catch (e) {
    console.error('Fehler beim Laden der Reisen:', e)
  }
}

async function waehleReise(reise) {
  selectedReiseId.value = reise.id
  selectedReise.value = reise
  schliesseBuchseite()
  try {
    const res = await axios.get(`${API}/reisen/${reise.id}/entries`)
    entries.value = res.data.sort((a, b) => a.datum.localeCompare(b.datum))
  } catch (e) {
    console.error('Fehler beim Laden der Einträge:', e)
  }
}

function eintragOeffnen(entry) {
  openEntry.value = entry
  isEditingEntry.value = false
  isNewEntry.value = false
}

function schliesseBuchseite() {
  openEntry.value = null
  isEditingEntry.value = false
  isNewEntry.value = false
  entryError.value = ''
}

function neuerEintragOeffnen() {
  if (!selectedReiseId.value) return
  openEntry.value = { datum: '', ort: '', text: '' }
  entryDatum.value = ''
  isEditingEntry.value = true
  isNewEntry.value = true

  // Fokus auf den Text-Bereich setzen nach dem Rendern
  nextTick(() => {
    if (textElement.value) textElement.value.focus()
  })
}

async function eintragBearbeitenStart() {
  entryDatum.value = openEntry.value.datum
  isEditingEntry.value = true

  // Fokus auf den Text-Bereich setzen nach dem Rendern
  nextTick(() => {
    if (textElement.value) {
      textElement.value.focus()
      // Cursor ans Ende setzen
      const range = document.createRange()
      range.selectNodeContents(textElement.value)
      range.collapse(false)
      window.getSelection().removeAllRanges()
      window.getSelection().addRange(range)
    }
  })
}

function eintragBearbeitenAbbrechen() {
  if (isNewEntry.value) {
    schliesseBuchseite()
  } else {
    // Originaltext wiederherstellen (contenteditable hat ihn vielleicht geändert)
    if (textElement.value) textElement.value.innerText = openEntry.value.text
    if (ortElement.value) ortElement.value.innerText = openEntry.value.ort || ''
    isEditingEntry.value = false
  }
}

async function eintragSpeichern() {
  // Text aus den contenteditable-Elementen auslesen
  const neuerText = textElement.value ? textElement.value.innerText.trim() : ''
  const neuerOrt = ortElement.value ? ortElement.value.innerText.trim() : ''

  if (!neuerText || !entryDatum.value) {
    entryError.value = 'Bitte mindestens Text und Datum angeben.'
    return
  }
  entryError.value = ''

  const daten = {
    text: neuerText,
    datum: entryDatum.value,
    ort: neuerOrt,
    reise: { id: selectedReiseId.value },
  }

  try {
    if (isNewEntry.value) {
      const res = await axios.post(`${API}/entries`, daten)
      entries.value.push(res.data)
      entries.value.sort((a, b) => a.datum.localeCompare(b.datum))
      openEntry.value = res.data
    } else {
      const res = await axios.put(`${API}/entries/${openEntry.value.id}`, daten)
      const i = entries.value.findIndex(e => e.id === openEntry.value.id)
      entries.value[i] = res.data
      entries.value.sort((a, b) => a.datum.localeCompare(b.datum))
      openEntry.value = res.data
    }
    isEditingEntry.value = false
    isNewEntry.value = false
  } catch (e) {
    console.error('Fehler beim Speichern:', e)
    entryError.value = 'Eintrag konnte nicht gespeichert werden.'
  }
}

async function eintragLoeschen() {
  if (!confirm('Diesen Eintrag wirklich löschen?')) return
  try {
    await axios.delete(`${API}/entries/${openEntry.value.id}`)
    entries.value = entries.value.filter(e => e.id !== openEntry.value.id)
    schliesseBuchseite()
  } catch (e) {
    console.error('Fehler beim Löschen:', e)
  }
}

function vorherigerEintrag() {
  const i = entries.value.findIndex(e => e.id === openEntry.value.id)
  if (i > 0) eintragOeffnen(entries.value[i - 1])
}

function naechsterEintrag() {
  const i = entries.value.findIndex(e => e.id === openEntry.value.id)
  if (i < entries.value.length - 1) eintragOeffnen(entries.value[i + 1])
}

function kurzDatum(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE')
}

function langDatum(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}

function vorschau(text) {
  if (text.length <= 90) return text
  return text.slice(0, 90) + '…'
}
</script>

<template>
  <div class="diary">

    <aside class="reisen-spalte">
      <div class="spalte-header">
        <h2>Meine Reisen</h2>
      </div>
      <div class="reiseplanung-hinweis">
        <RouterLink to="/reiseplanung" class="reiseplanung-link">Neue Reisen unter „Reise planen" anlegen →</RouterLink>
      </div>

      <p v-if="reisen.length === 0" class="hinweis">Noch keine Reisen angelegt.</p>

      <ul class="reisen-liste">
        <li
          v-for="reise in reisen"
          :key="reise.id"
          :class="['reise-card', { active: reise.id === selectedReiseId }]"
          @click="waehleReise(reise)"
        >
          <div class="reise-card-titel">{{ reise.titel }}</div>
          <div class="reise-card-ziel">{{ reise.reiseziel }}</div>
          <div class="reise-card-zeitraum">{{ kurzDatum(reise.startDatum) }} – {{ kurzDatum(reise.endDatum) }}</div>
        </li>
      </ul>
    </aside>

    <main class="detail-spalte">

      <div v-if="!selectedReise" class="leerer-zustand">
        <p>Wähle links eine Reise aus oder lege eine neue an.</p>
      </div>

      <div v-else-if="openEntry" class="buch-wrapper">
        <button class="zurueck-btn" @click="schliesseBuchseite">← Zurück zur Übersicht</button>

        <article class="buchseite">

          <!-- Fotos oben, nur im Ansicht-Modus -->
          <FotoUpload
            v-if="!isEditingEntry && openEntry.id"
            :entryId="openEntry.id"
            class="foto-header"
          />

          <header class="buchseite-header">
            <!-- Datum: normales Input beim Bearbeiten, sonst nur Text -->
            <template v-if="isEditingEntry">
              <input type="date" v-model="entryDatum" class="buchseite-input datum-input" />
            </template>
            <template v-else>
              <p class="buchseite-datum">{{ langDatum(openEntry.datum) }}</p>
            </template>

            <!-- Ort: contenteditable, immer sichtbar -->
            <p
              ref="ortElement"
              :contenteditable="isEditingEntry"
              :class="['buchseite-ort', { editierbar: isEditingEntry }]"
              :data-placeholder="isEditingEntry ? 'Ort eingeben…' : ''"
            >{{ openEntry.ort }}</p>
          </header>

          <hr class="buchseite-trenner" />

          <p v-if="entryError" class="fehler">{{ entryError }}</p>

          <!-- Text: contenteditable, immer sichtbar, wird beim Bearbeiten editierbar -->
          <p
            ref="textElement"
            :contenteditable="isEditingEntry"
            :class="['buchseite-text', { editierbar: isEditingEntry }]"
            :data-placeholder="isEditingEntry ? 'Was ist heute passiert?' : ''"
          >{{ openEntry.text }}</p>

          <footer class="buchseite-footer">
            <template v-if="isEditingEntry">
              <button class="btn-secondary klein" @click="eintragBearbeitenAbbrechen">Abbrechen</button>
              <button class="btn-primary klein" @click="eintragSpeichern">Speichern</button>
            </template>
            <template v-else>
              <button class="btn-secondary klein" @click="eintragBearbeitenStart">Bearbeiten</button>
              <button class="btn-secondary klein danger" @click="eintragLoeschen">Löschen</button>
            </template>
          </footer>
        </article>

        <div v-if="!isEditingEntry" class="buch-nav">
          <button class="nav-btn" @click="vorherigerEintrag">‹ Vorheriger Eintrag</button>
          <button class="nav-btn" @click="naechsterEintrag">Nächster Eintrag ›</button>
        </div>
      </div>

      <div v-else>
        <header class="reise-header">
          <h1>{{ selectedReise.titel }}</h1>
          <p class="reise-subtitle">
            {{ selectedReise.reiseziel }} · {{ kurzDatum(selectedReise.startDatum) }} – {{ kurzDatum(selectedReise.endDatum) }}
          </p>
          <p v-if="selectedReise.beschreibung" class="reise-beschreibung">{{ selectedReise.beschreibung }}</p>
        </header>

        <section class="eintraege-section">
          <div class="spalte-header">
            <h2>Tagebucheinträge</h2>
            <button class="btn-primary" @click="neuerEintragOeffnen">+ Neuer Eintrag</button>
          </div>

          <p v-if="entries.length === 0" class="hinweis">Noch keine Einträge für diese Reise.</p>

          <ul class="eintraege-liste">
            <li
              v-for="entry in entries"
              :key="entry.id"
              class="eintrag-zeile"
              @click="eintragOeffnen(entry)"
            >
              <span class="eintrag-zeile-datum">{{ kurzDatum(entry.datum) }}</span>
              <span v-if="entry.ort" class="eintrag-zeile-ort">📍 {{ entry.ort }}</span>
              <span class="eintrag-zeile-preview">{{ vorschau(entry.text) }}</span>
              <span class="eintrag-zeile-pfeil">›</span>
            </li>
          </ul>
        </section>
      </div>
    </main>

  </div>
</template>

<style scoped>
:global(body) { margin: 0; padding: 0; }
:global(#app) { width: 100vw; height: 100vh; margin: 0; padding: 0; }

.diary {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #1c140d;
  color: #f0e6d2;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

.reisen-spalte {
  flex: 0 0 320px;
  background: #241b12;
  border-right: 1px solid #3a2c1c;
  padding: 20px;
  overflow-y: auto;
}

.spalte-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 10px;
}
.spalte-header h2 { margin: 0; font-size: 1.05rem; }

.reisen-liste {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reise-card {
  background: #2b2014;
  border: 1px solid #3a2c1c;
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
}
.reise-card:hover { border-color: #4a3a24; background: #312419; }
.reise-card.active { border-color: #b8863f; background: #3a2c18; }

.reise-card-titel { font-weight: 700; font-size: 0.95rem; }
.reise-card-ziel { color: #c9b896; font-size: 0.82rem; margin-top: 2px; }
.reise-card-zeitraum { color: #8a7456; font-size: 0.75rem; margin-top: 4px; }

.detail-spalte {
  flex: 1;
  padding: 28px 36px;
  overflow-y: auto;
}

.leerer-zustand {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8a7456;
}

.reise-header h1 { margin: 0; font-size: 1.6rem; }
.reise-subtitle { color: #c9b896; margin: 6px 0 0; font-size: 0.9rem; }
.reise-beschreibung { color: #e0d4ba; margin: 10px 0 0; line-height: 1.5; max-width: 640px; }

.eintraege-section { margin-top: 32px; }

.eintraege-liste {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eintrag-zeile {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #241b12;
  border: 1px solid #3a2c1c;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
}
.eintrag-zeile:hover { border-color: #b8863f; background: #2b2014; }

.eintrag-zeile-datum {
  color: #c9963f;
  font-weight: 700;
  font-size: 0.82rem;
  flex-shrink: 0;
  width: 86px;
}
.eintrag-zeile-ort {
  color: #c9b896;
  font-size: 0.8rem;
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eintrag-zeile-preview {
  color: #a89878;
  font-size: 0.85rem;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eintrag-zeile-pfeil { color: #6b5a3e; font-size: 1.1rem; flex-shrink: 0; }

.buch-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 720px;
  margin: 0 auto;
}

.zurueck-btn {
  align-self: flex-start;
  background: transparent;
  border: none;
  color: #c9b896;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 6px 0;
  margin-bottom: 18px;
}
.zurueck-btn:hover { color: #c9963f; }

.buchseite {
  width: 100%;
  background: #f4ecdc;
  color: #2b2620;
  border-radius: 4px;
  padding: 48px 56px;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.3),
    0 12px 28px rgba(0,0,0,0.55),
    inset 0 0 60px rgba(120, 95, 55, 0.08);
}

.foto-header {
  margin-bottom: 28px;
}

.buchseite-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
  font-family: Georgia, 'Times New Roman', serif;
}

.buchseite-datum {
  margin: 0;
  font-size: 1.05rem;
  font-style: italic;
  color: #5a4c33;
}

/* Ort-Zeile: im Ansicht-Modus nur sichtbar wenn befüllt */
.buchseite-ort {
  margin: 0;
  font-size: 0.95rem;
  color: #6b5a3a;
  font-family: Georgia, 'Times New Roman', serif;
  min-width: 80px;
}

.buchseite-input {
  background: #fffaf0;
  border: 1px solid rgba(90, 76, 51, 0.4);
  border-radius: 5px;
  padding: 7px 10px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.95rem;
  color: #2b2620;
}
.datum-input { width: 170px; }

.buchseite-trenner {
  border: none;
  border-top: 1px solid rgba(90, 76, 51, 0.3);
  margin: 18px 0 26px;
}

/* Der Haupttext — sieht immer gleich aus, wird beim Bearbeiten editierbar */
.buchseite-text {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.08rem;
  line-height: 1.85;
  white-space: pre-wrap;
  margin: 0 0 30px;
  min-height: 120px;
  outline: none;
}

/* Wenn editierbar: subtiler Rahmen und Hintergrund als Hinweis */
.buchseite-text.editierbar,
.buchseite-ort.editierbar {
  background: rgba(255, 250, 240, 0.8);
  border-radius: 4px;
  padding: 8px;
  border: 1px dashed rgba(90, 76, 51, 0.4);
  cursor: text;
}

/* Placeholder-Text wenn leer und editierbar */
.buchseite-text.editierbar:empty::before,
.buchseite-ort.editierbar:empty::before {
  content: attr(data-placeholder);
  color: #b0a080;
  font-style: italic;
}

.buchseite-footer {
  display: flex;
  gap: 10px;
  border-top: 1px solid rgba(90, 76, 51, 0.2);
  padding-top: 18px;
  margin-top: 20px;
}

.buch-nav {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 22px;
  gap: 16px;
}
.nav-btn {
  background: #241b12;
  border: 1px solid #3a2c1c;
  color: #c9b896;
  border-radius: 7px;
  padding: 8px 16px;
  font-size: 0.82rem;
  cursor: pointer;
}
.nav-btn:hover { border-color: #c9963f; color: #c9963f; }

.btn-primary {
  background: #b8863f;
  color: #1c140d;
  border: none;
  border-radius: 7px;
  padding: 8px 14px;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
}
.btn-primary:hover { background: #c9963f; }
.btn-primary.klein { padding: 6px 12px; font-size: 0.78rem; }

.btn-secondary {
  background: transparent;
  color: #d8c8a8;
  border: 1px solid #4a3a24;
  border-radius: 7px;
  padding: 8px 14px;
  font-size: 0.82rem;
  cursor: pointer;
}
.btn-secondary:hover { border-color: #6b5a3e; }
.btn-secondary.klein { padding: 6px 12px; font-size: 0.78rem; }
.btn-secondary.danger:hover { background: #4a2418; border-color: #6b3424; color: #e89878; }

.reiseplanung-hinweis {
  border: 1px dashed #3a2c1c;
  background: #1c140d;
  border-radius: 8px;
  padding: 10px 12px;
  text-align: center;
  margin-bottom: 14px;
}
.reiseplanung-link {
  color: #a89878;
  font-weight: 600;
  font-size: 11px;
  text-decoration: none;
}
.reiseplanung-link:hover { color: #c9963f; }

.hinweis { color: #8a7456; font-size: 0.85rem; }
.fehler {
  color: #e89878;
  background: #3a1f14;
  border: 1px solid #5a2f1f;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.82rem;
  margin: 0 0 12px;
}
</style>
