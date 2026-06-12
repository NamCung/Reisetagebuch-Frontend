
<template>
  <div>
    <h2>Meine Reisen</h2>
    <input v-model="countryField" type="text" placeholder="Land" />
    <input v-model="countryCodeField" type="text" placeholder="Ländercode" />
    <button @click="save()">Hinzufügen</button>
    <p v-if="reisen.length === 0">Noch keine Reisen gespeichert.</p>
    <ul>
      <li v-for="reise in reisen" :key="reise.id">
        <strong>{{ reise.country }}</strong> ({{ reise.countryCode }})
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { VisitedCountry } from '@/types'

const reisen = ref<VisitedCountry[]>([])
const countryField = ref('')
const countryCodeField = ref('')

function loadCountries() {
  const baseUrl = import.meta.env.VITE_APP_BACKEND_BASE_URL
  const endpoint = baseUrl + '/countries'
  const requestOptions: RequestInit = { method: 'GET', redirect: 'follow' }

  fetch(endpoint, requestOptions)
    .then((response) => response.json())
    .then((result) => (reisen.value = result))
    .catch((error) => console.log(error))
}

async function save() {
  const baseUrl = import.meta.env.VITE_APP_BACKEND_BASE_URL
  const country = countryField.value
  const countryCode = countryCodeField.value

  await fetch(baseUrl + '/countries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country, countryCode }),
  })

  countryField.value = ''
  countryCodeField.value = ''
  loadCountries()
}

onMounted(() => {
  loadCountries()
})
</script>
