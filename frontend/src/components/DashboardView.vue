<script setup>
import StatCard from './StatCard.vue'
import { CATEGORIAS_INFO } from '../utils/datasetOffendES'
defineProps({ stats: Object, loading: Boolean, error: String, updated: String, history: Array })
defineEmits(['refresh', 'analyze'])
</script>
<template>
  <section>
    <div class="dashboard-intro">
      <div>
        <p class="eyebrow">VISIBILIDAD EN TIEMPO REAL</p>
        <h2>Conversaciones más seguras.<br />Decisiones más claras.</h2>
        <p>Detecta lenguaje ofensivo y comprende cada resultado con SocialTOX.</p>
      </div>
      <button class="btn-primary-analyze" @click="$emit('analyze')">Analizar comentario ↗</button>
    </div>
    <div class="section-label">
      <h2>Actividad del sistema</h2>
      <button class="btn-choose-file" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </div>
    <p v-if="error" class="error-banner" role="alert">
      {{ error }}
      <span v-if="stats"
        >Se muestran los últimos datos recibidos; pueden estar desactualizados.</span
      >
    </p>
    <p v-if="!stats" class="empty-state-card" role="status">
      {{
        loading
          ? 'Consultando estadísticas…'
          : 'Sin estadísticas disponibles. Comprueba la conexión y actualiza.'
      }}
    </p>
    <div class="stats-grid">
      <StatCard
        label="Comentarios analizados"
        :value="stats?.total_comentarios"
        detail="Total registrado por el servidor"
      /><StatCard
        label="No ofensivos"
        :value="stats?.categorias?.NO"
        detail="Categoría NO"
        tone="green"
      /><StatCard
        label="Lenguaje vulgar"
        :value="stats?.categorias?.NOE"
        detail="Categoría NOE"
        tone="amber"
      /><StatCard
        label="Comentarios ofensivos"
        :value="stats?.comentarios_ofensivos"
        detail="Categorías OFP + OFG"
        tone="red"
      />
    </div>
    <div class="dashboard-grid">
      <article class="content-card">
        <h2 class="card-heading">Distribución de resultados</h2>
        <p class="card-subheading">Las cuatro categorías reales del modelo.</p>
        <div v-for="(cat, code) in CATEGORIAS_INFO" :key="code" class="distribution-row">
          <div>
            <span :style="{ color: cat.color }">{{ code }} · {{ cat.nombre }}</span
            ><strong>{{ stats ? stats.categorias[code] : '—' }}</strong>
          </div>
          <div class="distribution-track">
            <div
              :style="{
                width:
                  (stats?.total_comentarios
                    ? (stats.categorias[code] / stats.total_comentarios) * 100
                    : 0) + '%',
                background: cat.color,
              }"
            ></div>
          </div>
        </div>
        <p v-if="stats?.total_comentarios === 0" class="card-subheading">
          Todavía no se han registrado análisis.
        </p>
      </article>
      <article class="content-card">
        <h2 class="card-heading">Moderación y rendimiento</h2>
        <p class="card-subheading">Indicadores operativos del servidor.</p>
        <dl class="operational-list">
          <div>
            <dt>Infracciones registradas</dt>
            <dd>{{ stats?.infracciones_registradas ?? '—' }}</dd>
          </div>
          <div>
            <dt>Restricciones aplicadas</dt>
            <dd>{{ stats?.restricciones_aplicadas ?? '—' }}</dd>
          </div>
          <div>
            <dt>Latencia media</dt>
            <dd>{{ stats ? stats.latencia_promedio_ms + ' ms' : '—' }}</dd>
          </div>
        </dl>
        <p class="data-footnote">
          Actualización cada 5 segundos. Los contadores se reinician con el servidor.<br />Última
          actualización: {{ updated || 'Pendiente' }}
        </p>
      </article>
    </div>
    <article class="content-card">
      <h2 class="card-heading">Actividad reciente de esta página</h2>
      <p class="card-subheading">Últimos análisis de tu visita. Se borran al recargar.</p>
      <div v-if="!history.length" class="empty-state-card">
        <h3>Tu primer análisis empieza aquí</h3>
        <p>Escribe un comentario para conocer su clasificación.</p>
        <button class="btn-primary-analyze" @click="$emit('analyze')">
          Analizar un comentario
        </button>
      </div>
      <div v-for="item in history.slice(0, 4)" :key="item.id" class="recent-row">
        <div>
          <p>{{ item.comentario }}</p>
          <small>{{ item.fecha }}</small>
        </div>
        <span class="sentiment-pill" :class="'pill-' + item.categoria.toLowerCase()">{{
          item.categoria
        }}</span>
      </div>
    </article>
  </section>
</template>
