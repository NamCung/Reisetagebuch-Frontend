<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-side"></div>

      <RouterLink to="/" class="logo"> Reisetagebuch</RouterLink>

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
  background: #1c140d;
}

.topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 12px 24px;
  background: #241b12;
  border-bottom: 1px solid #3a2c1c;
}

.topbar-side {
  flex: 1;
}

.logo {
  flex: 1;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: #c9963f;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
}

.logo:hover {
  color: #e0b15a;
}

.tabs {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.tab {
  padding: 8px 16px;
  border-radius: 8px;
  color: #a89878;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.tab:hover {
  background: #2b2014;
  color: #e0d4ba;
}

.tab.router-link-active {
  background: #c9963f;
  color: #1c140d;
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
