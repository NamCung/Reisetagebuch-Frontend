<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const passwort = ref('')
const fehler = ref('')
const modus = ref('login')

async function anmelden() {
  try {
    fehler.value = ''
    const url = modus.value === 'login' ? '/auth/anmelden' : '/auth/registrieren'
    const res = await axios.post(
      `${import.meta.env.VITE_APP_BACKEND_BASE_URL}${url}`,
      { email: email.value, passwort: passwort.value }
    )
    localStorage.setItem('token', res.data.token)
    router.push('/')
  } catch (e) {
    fehler.value = 'Fehler beim Anmelden'
  }
}
</script>

<template>
  <div class="login">
    <div class="box">
      <h2>🌍 Reisetagebuch</h2>

      <div class="tabs">
        <button :class="{ aktiv: modus === 'login' }" @click="modus = 'login'">Anmelden</button>
        <button :class="{ aktiv: modus === 'registrieren' }" @click="modus = 'registrieren'">Registrieren</button>
      </div>

      <input v-model="email" type="email" placeholder="E-Mail" />
      <input v-model="passwort" type="password" placeholder="Passwort" />

      <p v-if="fehler" class="fehler">{{ fehler }}</p>

      <button class="submit" @click="anmelden">
        {{ modus === 'login' ? 'Anmelden' : 'Registrieren' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #111;
}

.box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 320px;
}

h2 {
  text-align: center;
  margin: 0;
  font-size: 1.4rem;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tabs button {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.tabs button.aktiv {
  background: #27ae60;
  color: white;
  border-color: #27ae60;
}

input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 1rem;
}

.submit {
  padding: 12px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

.fehler {
  color: red;
  font-size: 0.85rem;
  margin: 0;
}
</style>
