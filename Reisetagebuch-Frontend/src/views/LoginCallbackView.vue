<template>
  <div class="warten">
    <p>Einen Moment bitte...</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { oktaAuth } from '../okta'

const router = useRouter()

onMounted(async () => {
  try {
    // Korrekter Methodenname für @okta/okta-auth-js
    await oktaAuth.handleLoginRedirect()
    // Email des Users speichern
    const user = await oktaAuth.getUser()
    localStorage.setItem('userEmail', user.email as string)
    router.push('/')
  } catch (e) {
    console.error('Callback Fehler:', e)
    router.push('/login')
  }
})
</script>

<style scoped>
.warten {
  color: white;
  text-align: center;
  background: #1c140d;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
