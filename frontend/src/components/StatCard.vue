<script setup>
defineProps({
  label: String,
  value: [String, Number],
  detail: String,
  tone: { type: String, default: 'blue' },
})
</script>
<template>
  <article class="stat-card" :class="'tone-' + tone">
    <span class="stat-marker"></span>
    <p>{{ label }}</p>
    <strong>{{ value ?? '—' }}</strong
    ><small>{{ detail }}</small>
  </article>
</template>
