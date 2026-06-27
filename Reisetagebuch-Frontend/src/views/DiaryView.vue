<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const API = import.meta.env.VITE_APP_BACKEND_BASE_URL

// alle Reisen und welche gerade ausgewählt ist
const reisen = ref([])
const selectedReiseId = ref(null)
const selectedReise = ref(null)

// Einträge der ausgewählten Reise
const entries = ref([])

// welcher Eintrag ist gerade als "Buchseite" geöffnet
const openEntry = ref(null)
const isEditingEntry = ref(false)
const isNewEntry = ref(false)

// Felder für die Buchseite (zum Bearbeiten/Neu-Anlegen)
const entryDatum = ref('')
const entryOrt = ref('')
const entryText = ref('')

const entryError = ref('')
const reiseError = ref('')

// Reise-Formular (Modal)
const showReiseForm = ref(false)
const editingReiseId = ref(null)
const reiseTitel = ref('')
const reiseZiel = ref('')
const reiseStart = ref('')
const reiseEnde = ref('')
const reiseBeschreibung = ref('')

onMounted(() => {
  ladeReisen()
})

// ── Reisen laden und auswählen ──────────────────

async function ladeReisen() {
  try {
    const res = await axios.get(`${API}/reisen`)
    reisen.value = res.data
    if (reisen.value.length > 0) {
      waehleReise(reisen.value[0])
    }
  } catch (e) {
    console.error('Fehler beim Laden der Reisen:', e)
    reiseError.value = 'Reisen konnten nicht geladen werden.'
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

// ── Reise anlegen / bearbeiten / löschen (Modal) ──

function neueReiseOeffnen() {
  editingReiseId.value = null
  reiseTitel.value = ''
  reiseZiel.value = ''
  reiseStart.value = ''
  reiseEnde.value = ''
  reiseBeschreibung.value = ''
  showReiseForm.value = true
}

function reiseBearbeitenOeffnen(reise) {
  editingReiseId.value = reise.id
  reiseTitel.value = reise.titel
  reiseZiel.value = reise.reiseziel
  reiseStart.value = reise.startDatum
  reiseEnde.value = reise.endDatum
  reiseBeschreibung.value = reise.beschreibung
  showReiseForm.value = true
}

function reiseFormSchliessen() {
  showReiseForm.value = false
}

async function reiseSpeichern() {
  if (!reiseTitel.value.trim()) {
    reiseError.value = 'Bitte einen Titel angeben.'
    return
  }
  reiseError.value = ''

  const daten = {
    titel: reiseTitel.value,
    reiseziel: reiseZiel.value,
    startDatum: reiseStart.value,
    endDatum: reiseEnde.value,
    beschreibung: reiseBeschreibung.value,
  }

  try {
    if (editingReiseId.value) {
      const res = await axios.put(`${API}/reisen/${editingReiseId.value}`, daten)
      const i = reisen.value.findIndex(r => r.id === editingReiseId.value)
      reisen.value[i] = res.data
      if (selectedReiseId.value === editingReiseId.value) selectedReise.value = res.data
    } else {
      const res = await axios.post(`${API}/reisen`, daten)
      reisen.value.push(res.data)
      waehleReise(res.data)
    }
    reiseFormSchliessen()
  } catch (e) {
    console.error('Fehler beim Speichern der Reise:', e)
    reiseError.value = 'Reise konnte nicht gespeichert werden.'
  }
}

async function reiseLoeschen(id) {
  if (!confirm('Diese Reise inklusive aller Einträge wirklich löschen?')) return
  try {
    await axios.delete(`${API}/reisen/${id}`)
    reisen.value = reisen.value.filter(r => r.id !== id)
    if (selectedReiseId.value === id) {
      selectedReise.value = null
      entries.value = []
      if (reisen.value.length > 0) waehleReise(reisen.value[0])
    }
  } catch (e) {
    console.error('Fehler beim Löschen der Reise:', e)
  }
}

// ── Buchseite: Eintrag ansehen / bearbeiten / neu anlegen ──

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
  entryOrt.value = ''
  entryText.value = ''
  isEditingEntry.value = true
  isNewEntry.value = true
}

function eintragBearbeitenStart() {
  entryDatum.value = openEntry.value.datum
  entryOrt.value = openEntry.value.ort
  entryText.value = openEntry.value.text
  isEditingEntry.value = true
}

function eintragBearbeitenAbbrechen() {
  if (isNewEntry.value) {
    schliesseBuchseite()
  } else {
    isEditingEntry.value = false
  }
}

async function eintragSpeichern() {
  if (!entryText.value.trim() || !entryDatum.value) {
    entryError.value = 'Bitte mindestens Text und Datum angeben.'
    return
  }
  entryError.value = ''

  const daten = {
    text: entryText.value,
    datum: entryDatum.value,
    ort: entryOrt.value,
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
    console.error('Fehler beim Speichern des Eintrags:', e)
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
    console.error('Fehler beim Löschen des Eintrags:', e)
  }
}

// vorheriger / nächster Eintrag in der Buchseite
function vorherigerEintrag() {
  const i = entries.value.findIndex(e => e.id === openEntry.value.id)
  if (i > 0) eintragOeffnen(entries.value[i - 1])
}

function naechsterEintrag() {
  const i = entries.value.findIndex(e => e.id === openEntry.value.id)
  if (i < entries.value.length - 1) eintragOeffnen(entries.value[i + 1])
}

// ── kleine Hilfsfunktionen für Anzeige ──────────

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

    <!-- Linke Spalte: Liste der Reisen -->
    <aside class="reisen-spalte">
      <div class="spalte-header">
        <h2>Meine Reisen</h2>
        <button class="btn-primary" @click="neueReiseOeffnen">+ Neue Reise</button>
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
          <div class="reise-card-actions">
            <button class="icon-btn" @click.stop="reiseBearbeitenOeffnen(reise)">✎</button>
            <button class="icon-btn danger" @click.stop="reiseLoeschen(reise.id)">🗑</button>
          </div>
        </li>
      </ul>
    </aside>

    <!-- Rechte Spalte -->
    <main class="detail-spalte">

      <div v-if="!selectedReise" class="leerer-zustand">
        <p>Wähle links eine Reise aus oder lege eine neue an.</p>
      </div>

      <!-- Buchseite: ansehen oder bearbeiten/neu -->
      <div v-else-if="openEntry" class="buch-wrapper">
        <button class="zurueck-btn" @click="schliesseBuchseite">← Zurück zur Übersicht</button>

        <article class="buchseite">

          <!-- Kopfzeile: entweder nur Anzeige oder Eingabefelder -->
          <header class="buchseite-header">
            <template v-if="isEditingEntry">
              <input type="date" v-model="entryDatum" class="buchseite-input datum-input" />
              <input type="text" v-model="entryOrt" placeholder="Ort eingeben…" class="buchseite-input ort-input" />
            </template>
            <template v-else>
              <p class="buchseite-datum">{{ langDatum(openEntry.datum) }}</p>
              <p v-if="openEntry.ort" class="buchseite-ort">📍 {{ openEntry.ort }}</p>
            </template>
          </header>

          <hr class="buchseite-trenner" />

          <p v-if="entryError" class="fehler">{{ entryError }}</p>

          <!-- Text: entweder nur Anzeige oder Textarea -->
          <textarea
            v-if="isEditingEntry"
            v-model="entryText"
            class="buchseite-textarea"
            placeholder="Was ist heute passiert?"
          ></textarea>
          <p v-else class="buchseite-text">{{ openEntry.text }}</p>

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

      <!-- Normale Ansicht: Reise-Infos + Liste der Einträge -->
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

    <!-- Modal: Reise anlegen/bearbeiten -->
    <div v-if="showReiseForm" class="modal-overlay" @click.self="reiseFormSchliessen">
      <div class="modal">
        <h2>{{ editingReiseId ? 'Reise bearbeiten' : 'Neue Reise' }}</h2>
        <p v-if="reiseError" class="fehler">{{ reiseError }}</p>

        <label>
          Titel
          <input type="text" v-model="reiseTitel" placeholder="z. B. Sommer in Italien" />
        </label>

        <label>
          Reiseziel
          <input type="text" v-model="reiseZiel" placeholder="z. B. Toskana, Italien" />
        </label>

        <div class="form-row">
          <label>
            Start
            <input type="date" v-model="reiseStart" />
          </label>
          <label>
            Ende
            <input type="date" v-model="reiseEnde" />
          </label>
        </div>

        <label>
          Beschreibung
          <textarea v-model="reiseBeschreibung" rows="3" placeholder="Kurze Beschreibung…"></textarea>
        </label>

        <div class="modal-actions">
          <button class="btn-secondary" @click="reiseFormSchliessen">Abbrechen</button>
          <button class="btn-primary" @click="reiseSpeichern">Speichern</button>
        </div>
      </div>
    </div>

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

/* Linke Spalte */
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
  position: relative;
}
.reise-card:hover { border-color: #4a3a24; background: #312419; }
.reise-card.active { border-color: #b8863f; background: #3a2c18; }

.reise-card-titel { font-weight: 700; font-size: 0.95rem; }
.reise-card-ziel { color: #c9b896; font-size: 0.82rem; margin-top: 2px; }
.reise-card-zeitraum { color: #8a7456; font-size: 0.75rem; margin-top: 4px; }

.reise-card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  opacity: 0;
}
.reise-card:hover .reise-card-actions { opacity: 1; }

/* Rechte Spalte */
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

/* schlanke Eintrags-Zeile */
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

/* Buchseite */
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
  position: relative;
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
.buchseite-ort {
  margin: 0;
  font-size: 0.95rem;
  color: #6b5a3a;
}

/* Eingabefelder in der Kopfzeile beim Bearbeiten/Neu-Anlegen */
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
.ort-input { flex: 1; min-width: 160px; }

.buchseite-trenner {
  border: none;
  border-top: 1px solid rgba(90, 76, 51, 0.3);
  margin: 18px 0 26px;
}

.buchseite-text {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.08rem;
  line-height: 1.85;
  white-space: pre-wrap;
  margin: 0 0 30px;
}

.buchseite-textarea {
  width: 100%;
  min-height: 280px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.08rem;
  line-height: 1.85;
  background: #fffaf0;
  border: 1px solid rgba(90, 76, 51, 0.4);
  border-radius: 5px;
  padding: 14px;
  color: #2b2620;
  resize: vertical;
  margin-bottom: 20px;
}

.buchseite-footer {
  display: flex;
  gap: 10px;
  border-top: 1px solid rgba(90, 76, 51, 0.2);
  padding-top: 18px;
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

/* Buttons */
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

.icon-btn {
  background: #2b2014;
  border: 1px solid #3a2c1c;
  color: #d8c8a8;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 0.85rem;
}
.icon-btn:hover { background: #312419; }
.icon-btn.danger:hover { background: #4a2418; border-color: #6b3424; color: #e89878; }

/* Hinweise / Fehler */
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

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: #2a221a;
  border: 1px solid #4a3c28;
  border-radius: 12px;
  padding: 26px 28px;
  width: 420px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  color: #f0e6d2;
}
.modal h2 { margin: 0 0 16px; font-size: 1.15rem; color: #f0e6d2; }

.modal label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
  color: #c9b896;
  margin-bottom: 14px;
}

.modal input,
.modal textarea {
  background: #1f1810;
  border: 1px solid #4a3c28;
  border-radius: 6px;
  padding: 9px 10px;
  color: #f0e6d2;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}
.modal input:focus,
.modal textarea:focus {
  outline: none;
  border-color: #c9963f;
}

.form-row {
  display: flex;
  gap: 12px;
}
.form-row label { flex: 1; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}
</style>
