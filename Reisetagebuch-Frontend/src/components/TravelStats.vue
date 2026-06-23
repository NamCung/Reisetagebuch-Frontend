<template>
  <div class="stats-panel">
    <div class="stat">
      <span class="stat-value">{{ worldPercent }}%</span>
      <span class="stat-label">Welt</span>
    </div>

    <!-- Kreisdiagramm -->
    <svg viewBox="0 0 36 36" class="progress-ring">
      <circle cx="18" cy="18" r="15" fill="none" stroke="#3a3a3a" stroke-width="3"/>
      <circle
        cx="18" cy="18" r="15"
        fill="none"
        stroke="#f5a623"
        stroke-width="3"
        stroke-dasharray="94.2"
        :stroke-dashoffset="94.2 - (94.2 * worldPercent / 100)"
        stroke-linecap="round"
        transform="rotate(-90 18 18)"
      />
    </svg>

    <div class="stat">
      <span class="stat-value">{{ visitedCount }}</span>
      <span class="stat-label">Länder</span>
    </div>

    <p class="stat-sub">von 266 Ländern und Territorien</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visitedCount: number
}>()

const worldPercent = computed(() =>
  Math.round((props.visitedCount / 266) * 100)
)
</script>

<style scoped>
.stats-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #2a2a2a;
  border-radius: 16px;
  padding: 20px 24px;
  color: white;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #f5a623;
  display: block;
}

.stat-label {
  font-size: 0.85rem;
  color: #888;
}

.progress-ring {
  width: 64px;
  height: 64px;
}

.stat-sub {
  width: 100%;
  text-align: center;
  color: #666;
  font-size: 0.75rem;
  margin-top: 8px;
}
</style>
