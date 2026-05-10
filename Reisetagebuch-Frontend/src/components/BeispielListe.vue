
<template>
  <div>
    <h2>Meine Reisen</h2>
    <ul>
      <li v-for="reise in reisen" :key="reise.countryCode">
        <strong>{{ reise.country }}</strong> ({{ reise.countryCode }})
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">

import { ref } from 'vue'

const reisen = ref([])

function loadCountries() {
  const baseUrl = import.meta.env.VITE_APP_BACKEND_BASE_URL
  const endpoint = baseUrl + "/countries"
  const requestOptions = { method: "GET", redirect: "follow" }

  fetch(endpoint, requestOptions)
    .then(response => response.json())
    .then(result => reisen.value = result)
    .catch(error => console.log(error))
}

loadCountries()
</script>
