import { ref, onMounted } from 'vue'
import axios from 'axios'

const visitedCountries = ref([] as string[])
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
`${import.meta.env.VITE_APP_BACKEND_BASE_URL}/countries`
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
country: name,
})
visitedCountries.value.push(code)
}
}
