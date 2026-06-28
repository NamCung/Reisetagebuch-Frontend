<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const API = import.meta.env.VITE_APP_BACKEND_BASE_URL

const reisen = ref<any[]>([])
const neueReise = ref({
  titel: '',
  reiseziel: '',
  startDatum: '',
  endDatum: '',
  beschreibung: ''
})

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
  try {
    await axios.post(`${API}/reisen`, { ...neueReise.value, status })
    neueReise.value = { titel: '', reiseziel: '', startDatum: '', endDatum: '', beschreibung: '' }
    await ladeReisen()
  } catch (e) {
    console.error('Fehler beim Anlegen der Reise:', e)
  }
}

function kurzDatum(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('de-DE')
}

function countdown(startDatum: string): string | null {
  if (!startDatum) return null
  const heute = new Date()
  heute.setHours(0, 0, 0, 0)
  const start = new Date(startDatum)
  start.setHours(0, 0, 0, 0)
  const diff = Math.ceil((start.getTime() - heute.getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return null
  return `in ${diff} Tag${diff === 1 ? '' : 'en'}`
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
          <div class="label-klein">NEUE REISE</div>
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
              <button class="btn-grau" @click="reiseAnlegen('ENTWURF')">Entwurf speichern</button>
              <button class="btn-gold" @click="reiseAnlegen('GEPLANT')">Anlegen</button>
            </div>
          </div>
        </div>

        <!-- Rechte Spalte: Liste -->
        <div>
          <div class="label-klein">ALLE REISEN</div>
          <div class="card">
            <p v-if="sortierteReisen.length === 0" class="keine-reisen">Noch keine Reisen angelegt.</p>
            <div
              v-for="(reise, i) in sortierteReisen"
              :key="reise.id"
              :class="['reise-zeile', { letzte: i === sortierteReisen.length - 1 }]"
            >
              <div class="zeile-links">
                <div class="zeile-titel-reihe">
                  <span class="zeile-titel">{{ reise.titel }}</span>
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
                <span v-if="reise.status === 'GEPLANT' && countdown(reise.startDatum)" class="countdown">
                  {{ countdown(reise.startDatum) }}
                </span>
                <span v-else class="keine-details">Details fehlen</span>
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

.seiten-kopf {
  margin-bottom: 22px;
}

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

.datum-row {
  display: flex;
  gap: 8px;
}
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

.keine-reisen {
  color: #8a7456;
  font-size: 0.85rem;
  margin: 0;
}

.reise-zeile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #3a2c1c;
}
.reise-zeile.letzte { border-bottom: none; }

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
  text-align: right;
}

.countdown {
  color: #c9963f;
  font-weight: 600;
  font-size: 0.82rem;
}

.keine-details {
  color: #a89878;
  font-size: 0.78rem;
}
</style>