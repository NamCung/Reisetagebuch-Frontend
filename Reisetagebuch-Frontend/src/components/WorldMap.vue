<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

const visitedCountries = ref<string[]>([])
const hoveredCountry = ref('')

const countries = [
  { code: 'DE', name: 'Deutschland' },
  { code: 'FR', name: 'Frankreich' },
  { code: 'IT', name: 'Italien' },
  { code: 'ES', name: 'Spanien' },
  { code: 'US', name: 'USA' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australien' },
  { code: 'BR', name: 'Brasilien' },
  { code: 'IN', name: 'Indien' },
  { code: 'CN', name: 'China' },
]

onMounted(async () => {
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_APP_BACKEND_BASE_URL}/countries/visited`
    )
    visitedCountries.value = res.data.map((c: any) => c.countryCode)
  } catch (e) {
    console.error('Fehler beim Laden:', e)
  }
})

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
  <div class="map-container">
    <div class="country-chips">
      <button
        v-for="c in countries"
        :key="c.code"
        :class="['chip', { visited: visitedCountries.includes(c.code) }]"
        @click="toggleCountry(c.code, c.name)"
        @mouseenter="hoveredCountry = c.name"
        @mouseleave="hoveredCountry = ''"
      >
        {{ c.name }}
      </button>
    </div>

    <div v-if="hoveredCountry" class="tooltip">
      {{ hoveredCountry }}
      <span v-if="visitedCountries.includes(
        countries.find(c => c.name === hoveredCountry)?.code ?? ''
      )">✓ Besucht</span>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  background: #1a1a1a;
  border-radius: 16px;
  padding: 24px;
  position: relative;
}
.country-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #3a3a3a;
  background: #2a2a2a;
  color: #aaa;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.chip:hover { border-color: #f5a623; color: #f5a623; }
.chip.visited {
  background: #f5a623;
  border-color: #f5a623;
  color: #111;
  font-weight: 600;
}
.tooltip {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.85);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  pointer-events: none;
}
</style>
