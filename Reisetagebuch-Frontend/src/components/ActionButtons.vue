<template>
  <div class="action-buttons">
    <button class="btn btn-primary" @click="$router.push('/reisetagebuch/neu')">
      📖 Tagebuch schreiben
    </button>
    <button class="btn btn-secondary" @click="openPlanner">
      🗺️ Reise planen
    </button>
  </div>

  <!-- Google Maps Modal für Reiseplanung -->
  <div v-if="showPlanner" class="modal-overlay" @click.self="showPlanner = false">
    <div class="modal">
      <h2>Reise planen</h2>
      <div id="google-map" style="width:100%; height:400px; border-radius:12px;"></div>
      <input
        v-model="destination"
        placeholder="Ziel eingeben..."
        class="input"
        @keyup.enter="searchPlace"
      />
      <div class="modal-actions">
        <button class="btn btn-primary" @click="saveTrip">Reise speichern</button>
        <button class="btn btn-ghost" @click="showPlanner = false">Schließen</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

const showPlanner = ref(false)
const destination = ref('')
let map: any = null

function openPlanner() {
  showPlanner.value = true
  nextTick(() => initMap())
}

function initMap() {
  const { google } = window as any
  map = new google.maps.Map(document.getElementById('google-map'), {
    center: { lat: 20, lng: 10 },
    zoom: 2,
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#f5a623' }] },
    ],
  })
}

function searchPlace() {
  const { google } = window as any
  const geocoder = new google.maps.Geocoder()
  geocoder.geocode({ address: destination.value }, (results: any) => {
    if (results[0]) {
      map.setCenter(results[0].geometry.location)
      map.setZoom(8)
      new google.maps.Marker({ position: results[0].geometry.location, map })
    }
  })
}

async function saveTrip() {
  // Trip ans Backend senden
  console.log('Reise gespeichert:', destination.value)
  showPlanner.value = false
}
</script>
