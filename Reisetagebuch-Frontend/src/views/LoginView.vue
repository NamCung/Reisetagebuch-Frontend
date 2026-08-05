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
      <h2>Reisetagebuch</h2>

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
  background: #1a1209;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.box {
  background: #2a1f0e;
  border: 1px solid #c8972a;
  padding: 48px 40px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 340px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

h2 {
  text-align: center;
  color: #c8972a;
  font-size: 1.6rem;
  margin: 0 0 8px 0;
  font-weight: 700;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tabs button {
  flex: 1;
  padding: 9px;
  border: 1px solid #c8972a;
  background: transparent;
  color: #c8972a;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.tabs button.aktiv {
  background: #c8972a;
  color: #1a1209;
  font-weight: 700;
}

input {
  padding: 11px 14px;
  border: 1px solid #3d2e14;
  background: #1a1209;
  color: #e8d5a3;
  border-radius: 6px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #c8972a;
}

input::placeholder {
  color: #6b5a3a;
}

.submit {
  padding: 12px;
  background: #c8972a;
  color: #1a1209;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 4px;
  transition: background 0.2s;
}

.submit:hover {
  background: #e0aa30;
}

.fehler {
  color: #e05555;
  font-size: 0.85rem;
  margin: 0;
  text-align: center;
}
</style>
