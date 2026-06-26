<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <span class="logo">🌍 Reisetagebuch</span>

      <nav class="tabs">
        <RouterLink to="/" class="tab">Weltkarte</RouterLink>
        <RouterLink to="/reisetagebuch" class="tab">Tagebuch</RouterLink>
        <RouterLink to="/reiseplanung" class="tab">Reise planen</RouterLink>
      </nav>
    </header>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #111;
}

.topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 12px 24px;
  background: #161616;
  border-bottom: 1px solid #2a2a2a;
}

.logo {
  font-size: 1.2rem;
  font-weight: 700;
  color: #27ae60;
  white-space: nowrap;
}

.tabs {
  display: flex;
  gap: 6px;
}

.tab {
  padding: 8px 16px;
  border-radius: 8px;
  color: #999;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.tab:hover {
  background: #222;
  color: #ddd;
}

.tab.router-link-active {
  background: #27ae60;
  color: #0d0d0d;
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 640px) {
  .topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .tabs {
    justify-content: space-between;
  }
  .tab {
    flex: 1;
    text-align: center;
    padding: 8px 6px;
    font-size: 0.8rem;
  }
}
</style>
