<template>
  <div>
    <h2>Meine Reisen</h2>
    <ul>
      <li v-for="reise in reisen" :key="reise.id">
        <strong>{{ reise.titel }}</strong> – {{ reise.ort }}, {{ reise.land }} ({{ reise.datum }})
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const reisen = [
  { id: 1, titel: "Strandurlaub", ort: "Barcelona", land: "Spanien", datum: "2024-07-10" },
  { id: 2, titel: "Städtetrip", ort: "Paris", land: "Frankreich", datum: "2024-09-05" },
  { id: 3, titel: "Wanderurlaub", ort: "Zürich", land: "Schweiz", datum: "2025-01-20" },
]
</script>
