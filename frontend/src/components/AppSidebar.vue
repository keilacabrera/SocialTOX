<script setup>
defineProps({ active: String, open: Boolean })
defineEmits(['navigate', 'close'])
const items = [
  ['panel', 'Panel principal', 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'],
  ['analizar', 'Analizar comentario', 'M4 4h16v12H8l-4 4z M8 8h8 M8 12h5'],
  ['lote', 'Análisis por lotes', 'M7 3h10l4 4v14H7z M17 3v5h4 M3 7v14 M11 12h6 M11 16h6'],
  ['historial', 'Historial', 'M3 12a9 9 0 1 0 3-7 M3 3v5h5 M12 7v5l3 2'],
  ['moderacion', 'Moderación y sanciones', 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6'],
  ['metricas', 'Evaluación de modelos', 'M4 3v17h17 M8 16v-5 M13 16V6 M18 16v-8'],
  ['datos', 'Muestras', 'M4 5h16v15H4z M4 10h16 M10 10v10'],
]
</script>
<template>
  <button
    v-if="open"
    class="sidebar-scrim"
    aria-label="Cerrar navegación"
    @click="$emit('close')"
  ></button>
  <aside class="sidebar" :class="{ 'is-open': open }">
    <a class="sidebar-brand" href="#contenido" @click.prevent="$emit('navigate', 'panel')"
      ><span class="brand-symbol">S</span
      ><span>Social<b>TOX</b><small>CONTENT INTELLIGENCE</small></span></a
    >
    <p class="sidebar-caption">ESPACIO DE TRABAJO</p>
    <nav aria-label="Navegación principal">
      <button
        v-for="[key, label, path] in items"
        :key="key"
        :class="{ selected: active === key }"
        :aria-current="active === key ? 'page' : undefined"
        @click="$emit('navigate', key)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path :d="path" /></svg
        >{{ label }}
      </button>
    </nav>
    <div class="sidebar-bottom">
      Lenguaje que importa<small>Moderación inteligente en español</small>
    </div>
  </aside>
</template>
