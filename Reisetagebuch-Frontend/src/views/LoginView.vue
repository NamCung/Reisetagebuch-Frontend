<template>
  <div class="login-seite">
    <div class="login-box">
      <h1 class="titel">Reisetagebuch</h1>
      <p class="untertitel">Bitte melde dich an</p>

      <button class="login-btn" @click="zuOktaWeiterleiten">
        Mit Okta anmelden
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { oktaAuth } from '../okta'

// Direkt zu Okta weiterleiten ohne Widget
async function zuOktaWeiterleiten() {
  await oktaAuth.signInWithRedirect()
}
</script>

<style scoped>
.login-seite {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #1c140d;
}

.login-box {
  text-align: center;
  padding: 40px;
}

.titel {
  color: #c9963f;
  font-size: 2rem;
  margin-bottom: 8px;
}

.untertitel {
  color: #888;
  margin-bottom: 24px;
}

.login-btn {
  background: #c9963f;
  color: #1c140d;
  border: none;
  padding: 14px 32px;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.login-btn:hover {
  background: #e0b15a;
}
</style>
