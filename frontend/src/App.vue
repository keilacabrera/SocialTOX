<script setup>
import AppSidebar from './components/AppSidebar.vue'
import DashboardView from './components/DashboardView.vue'
import { useSocialTox } from './composables/useSocialTox'
const {
  pestanaActiva,
  apiConectada,
  API_URL,
  sesionLista,
  ahora,
  verificacionPendiente,
  restriccionActiva,
  segundosRestantes,
  bloqueado,
  tiempoFormateado,
  duracionRestriccion,
  progresoRestriccion,
  comprobandoVencimiento,
  comentario,
  cargando,
  errorAnalisis,
  infraccionesSesion,
  resultadoAnalisis,
  pipelineNLP,
  latenciaMs,
  archivoSeleccionado,
  nombreArchivo,
  cargandoLote,
  totalFilasLote,
  loteEjecutado,
  errorLote,
  filasOmitidas,
  resultadosLote,
  inputArchivoRef,
  metricasBackend,
  cargandoMetricas,
  errorMetricas,
  modeloConfusionActivo,
  nombresModelos,
  modelosDisponibles,
  categoriasEvaluacion,
  modelosEvaluados,
  modeloEvaluadoActual,
  porcentajeEvaluacion,
  tresDecimales,
  matrizEvaluacion,
  reporteEvaluacion,
  estadisticasVivo,
  cargandoEstadisticas,
  errorEstadisticas,
  actualizadasEstadisticas,
  categoriasVivo,
  totalVivo,
  conteoCategoriaVivo,
  porcentajeCategoriaVivo,
  filtroDatos,
  busquedaDatos,
  historialAnalisis,
  filtroHistorial,
  statsLoteResumen,
  muestrasDatosFiltradas,
  menuAbierto,
  busquedaHistorial,
  detalleHistorial,
  dialogoDetalle,
  historialFiltrado,
  actualizarRestriccion,
  cargarMetricas,
  cargarEstadisticas,
  solicitarAPI,
  verificarSesionBackend,
  verificarFinRestriccion,
  cargarEjemplo,
  consultarModelo,
  analizarTextoActual,
  limpiarAnalizador,
  cargarEjemploLoteCsv,
  dispararSeleccionArchivo,
  manejarArchivoSeleccionado,
  clasificarArchivoLote,
  descargarResultadosLoteCsv,
  probarMuestraEnAnalizador,
  limpiarHistorial,
  navegar,
  CATEGORIAS_INFO,
} = useSocialTox()
const titulos = {
  panel: 'Panel principal',
  analizar: 'Analizar comentario',
  lote: 'Análisis por lotes',
  historial: 'Historial de análisis',
  moderacion: 'Moderación y sanciones',
  metricas: 'Evaluación de modelos',
  datos: 'Muestras de comentarios',
}
</script>

<template>
  <div class="app-layout">
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <AppSidebar
      :active="pestanaActiva"
      :open="menuAbierto"
      @navigate="navegar"
      @close="menuAbierto = false"
    />
    <header class="workspace-header">
      <button
        class="mobile-toggle"
        aria-label="Abrir navegación"
        :aria-expanded="menuAbierto"
        @click="menuAbierto = true"
      >
        ☰</button
      ><span
        >Espacio de trabajo / <strong>{{ titulos[pestanaActiva] }}</strong></span
      ><span class="connection" :class="{ online: apiConectada }"
        >● {{ apiConectada ? 'API conectada' : 'Sin conexión' }}</span
      >
    </header>
    <!-- CONTENIDO PRINCIPAL -->

    <main id="contenido" class="main-body">
      <div class="page-heading">
        <p class="eyebrow">PLATAFORMA DE MODERACIÓN · ESPAÑOL</p>
        <h1>{{ titulos[pestanaActiva] }}</h1>
        <p>Comprende cada comentario. Construye conversaciones más seguras.</p>
      </div>
      <DashboardView
        v-if="pestanaActiva === 'panel'"
        :stats="estadisticasVivo"
        :loading="cargandoEstadisticas"
        :error="errorEstadisticas"
        :updated="actualizadasEstadisticas"
        :history="historialAnalisis"
        @refresh="cargarEstadisticas"
        @analyze="navegar('analizar')"
      />
      <section v-if="pestanaActiva === 'moderacion'" class="content-card">
        <h2 class="card-heading">Estado de tu sesión</h2>
        <p class="card-subheading">El estado y el vencimiento se verifican con el servidor.</p>
        <div class="moderation-overview">
          <div>
            <p class="eyebrow">ESTADO ACTUAL</p>
            <h3>{{ !sesionLista ? 'Sin verificar' : bloqueado ? 'Restringido' : 'Activo' }}</h3>
          </div>
          <div>
            <p class="eyebrow">INFRACCIONES</p>
            <h3>{{ sesionLista ? infraccionesSesion : '—' }}</h3>
          </div>
        </div>
        <button
          class="btn-choose-file"
          :disabled="comprobandoVencimiento"
          @click="verificarFinRestriccion"
        >
          Verificar sesión
        </button>
        <p v-if="errorAnalisis" class="error-banner" role="alert">{{ errorAnalisis }}</p>
        <h3 class="policy-heading">Reglas vigentes</h3>
        <p class="card-subheading">
          OFP y OFG generan una infracción con confianza ≥ 80 % y margen ≥ 20 %. NOE recibe una
          advertencia contextual sin sumar infracciones.
        </p>
        <div class="table-scroll">
          <table class="batch-results-table">
            <thead>
              <tr>
                <th>Infracción</th>
                <th>Consecuencia</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(minutos, i) in [0, 1, 5, 15, 30]" :key="i">
                <td>{{ i === 4 ? '5 o más' : i + 1 }}</td>
                <td>{{ minutos ? 'Restricción de ' + minutos + ' minutos' : 'Advertencia' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="session-status-note" role="status">
        Infracciones acumuladas: <strong>{{ infraccionesSesion }}</strong>
      </div>
      <section v-if="bloqueado" class="aviso-restriccion" role="alert" aria-live="polite">
        <div class="restriccion-cabecera">
          <strong>Restricción activa</strong>
          <span class="restriccion-etiqueta">RESTRINGIDO</span>
        </div>
        <p>{{ restriccionActiva.mensaje }}</p>
        <!-- <p>
          Infracciones acumuladas: <strong>{{ infraccionesSesion }}</strong>
        </p> -->
        <div class="restriccion-tiempo">{{ tiempoFormateado }}</div>
        <div class="restriccion-barra-fondo">
          <div class="restriccion-barra" :style="{ width: `${progresoRestriccion}%` }"></div>
        </div>
        <p v-if="segundosRestantes > 0">
          El análisis individual y por lotes está bloqueado hasta finalizar la restricción.
        </p>
        <p v-else>
          El tiempo terminó. Se necesita confirmar con FastAPI que la sesión está habilitada.
        </p>
        <button
          v-if="segundosRestantes === 0"
          class="btn-comprobar"
          :disabled="comprobandoVencimiento"
          @click="verificarFinRestriccion"
        >
          {{ comprobandoVencimiento ? 'Verificando...' : 'Verificar estado con servidor' }}
        </button>
      </section>

      <!-- ==================================================================== -->
      <!-- PESTAÑA 1: ANALIZAR (DISEÑO 2 COLUMNAS · IMÁGENES 1, 2 Y 3 PREVIAS)  -->
      <!-- ==================================================================== -->
      <div v-show="pestanaActiva === 'analizar'" class="analyze-view">
        <div class="grid-two-columns">
          <!-- COLUMNA IZQUIERDA: ENTRADA Y RESULTADO -->
          <div class="left-column">
            <!-- TARJETA: ESCRIBE UNA RESEÑA -->
            <div class="content-card">
              <h2 class="card-heading">Escribe un comentario</h2>
              <button class="clear-editor" @click="limpiarAnalizador" :disabled="cargando">
                Limpiar editor
              </button>
              <p class="card-subheading">
                El modelo OffendES detecta lenguaje ofensivo y aplica la moderación de tu sesión.
              </p>

              <div class="input-wrapper">
                <textarea
                  v-model="comentario"
                  class="comment-textarea"
                  rows="4"
                  maxlength="1000"
                  aria-label="Comentario para analizar"
                  :aria-invalid="!!errorAnalisis"
                  placeholder="Escribe un comentario para evaluar si contiene lenguaje ofensivo..."
                  :disabled="cargando || bloqueado"
                ></textarea>

                <div class="textarea-footer">
                  <span class="char-count">{{ comentario.length }} / 1000</span>
                  <button
                    class="btn-primary-analyze"
                    :disabled="cargando || cargandoLote || bloqueado || !comentario.trim()"
                    @click="analizarTextoActual"
                  >
                    <span v-if="cargando" class="spinner"></span>
                    {{ cargando ? 'Analizando...' : bloqueado ? 'Análisis bloqueado' : 'Analizar' }}
                  </button>
                </div>
              </div>

              <!-- CHIPS PROBAR CON (Ejemplos conectados a OffendES) -->
              <div class="sample-pills-row">
                <span class="sample-label">Probar con:</span>
                <div class="chips-container">
                  <button
                    class="sample-chip"
                    @click="
                      cargarEjemplo('Eres una estúpida e inútil, no sirves para nada cállate ya')
                    "
                  >
                    Insulto directo (OFP)
                  </button>
                  <button
                    class="sample-chip"
                    @click="
                      cargarEjemplo(
                        'Todos esos inmigrantes deberían ser expulsados del país inmediatamente',
                      )
                    "
                  >
                    Odio grupal (OFG)
                  </button>
                  <button
                    class="sample-chip"
                    @click="cargarEjemplo('No mames qué calor de mierda hace hoy en la calle')"
                  >
                    Vulgar no ofensivo (NOE)
                  </button>
                  <button
                    class="sample-chip"
                    @click="
                      cargarEjemplo(
                        'Muchas gracias por compartir este material tan útil y formativo',
                      )
                    "
                  >
                    No ofensivo (NO)
                  </button>
                  <button
                    class="sample-chip"
                    @click="
                      cargarEjemplo(
                        'El majadito estaba riquísimo y la atención fue muy amable 😊 Volvería sin dudar',
                      )
                    "
                  >
                    Reseña positiva
                  </button>
                </div>
              </div>

              <div
                v-if="resultadoAnalisis?.moderacion"
                class="moderation-notice"
                role="status"
                aria-live="polite"
                :class="{
                  'moderation-notice-warning': resultadoAnalisis.moderacion.estado !== 'PERMITIDO',
                }"
              >
                <strong>{{
                  resultadoAnalisis.moderacion.estado === 'SIN_SANCION'
                    ? 'Atención: posible contenido ofensivo, sin sanción'
                    : resultadoAnalisis.moderacion.estado.replaceAll('_', ' ')
                }}</strong>
                <p>{{ resultadoAnalisis.moderacion.mensaje }}</p>
                <p v-if="resultadoAnalisis.moderacion.estado === 'SIN_SANCION'">
                  No se registró una nueva infracción. Clasificar como ofensivo no implica
                  automáticamente una sanción.
                </p>
                <span
                  >Infracciones acumuladas: {{ resultadoAnalisis.moderacion.infracciones }}</span
                >
              </div>

              <div v-if="errorAnalisis" class="error-banner">
                {{ errorAnalisis }}
              </div>
            </div>

            <!-- TARJETA: RESULTADO DEL ANÁLISIS (Imagen 3) -->
            <div v-if="resultadoAnalisis" class="content-card result-panel" aria-live="polite">
              <blockquote class="result-quote">{{ resultadoAnalisis.texto }}</blockquote>
              <div
                class="result-top-banner"
                :class="
                  'banner-' +
                  (
                    resultadoAnalisis.categoria ||
                    resultadoAnalisis.sentimiento ||
                    'neutro'
                  ).toLowerCase()
                "
              >
                <h3
                  class="result-title"
                  :class="
                    'text-' +
                    (
                      resultadoAnalisis.categoria ||
                      resultadoAnalisis.sentimiento ||
                      'neutro'
                    ).toLowerCase()
                  "
                >
                  {{
                    resultadoAnalisis.categoria
                      ? CATEGORIAS_INFO[resultadoAnalisis.categoria]?.nombre ||
                        resultadoAnalisis.categoria
                      : resultadoAnalisis.sentimiento
                  }}
                </h3>
                <div
                  class="result-percentage"
                  :class="
                    'text-' +
                    (
                      resultadoAnalisis.categoria ||
                      resultadoAnalisis.sentimiento ||
                      'neutro'
                    ).toLowerCase()
                  "
                >
                  {{ resultadoAnalisis.probabilidad }}
                </div>
              </div>

              <!-- BARRAS DE PROBABILIDAD (Soporta OffendES y Sentimientos) -->
              <div class="probabilities-list">
                <div
                  v-for="(prob, clave) in resultadoAnalisis.probabilidades"
                  :key="clave"
                  class="prob-row"
                >
                  <div class="prob-label-group">
                    <span class="category-dot" :class="'dot-' + clave.toLowerCase()"></span>
                    <span class="prob-name">{{ CATEGORIAS_INFO[clave]?.nombre || clave }}</span>
                  </div>
                  <div class="prob-bar-container">
                    <div
                      class="prob-bar-fill"
                      :class="'bar-' + clave.toLowerCase()"
                      :style="{ width: `${prob * 100}%` }"
                    ></div>
                  </div>
                  <span class="prob-value">{{ (prob * 100).toFixed(1) }} %</span>
                </div>
              </div>

              <!-- PIE DE TARJETA: MODELO Y LATENCIA -->
              <div class="result-meta-footer">
                <span class="meta-tag"
                  >OffendES · {{ latenciaMs }} ms · Margen:
                  {{ (resultadoAnalisis.margen * 100).toFixed(2) }} %</span
                >
              </div>

              <!-- DECISIÓN DE MODERACIÓN (Si la API devuelve estado) -->
              <div v-if="resultadoAnalisis.moderacion" class="moderation-decision-box">
                <div class="decision-header">
                  <span
                    class="decision-badge"
                    :class="'badge-' + (resultadoAnalisis.moderacion.estado || '').toLowerCase()"
                  >
                    {{ resultadoAnalisis.moderacion.estado }}
                  </span>
                </div>
                <p class="decision-desc">
                  {{ resultadoAnalisis.moderacion.mensaje }}
                </p>
                <div
                  v-if="resultadoAnalisis.moderacion.infracciones !== undefined"
                  class="session-status-note"
                >
                  <p v-if="resultadoAnalisis.moderacion.duracion_minutos">
                    Restricción aplicada:
                    {{ resultadoAnalisis.moderacion.duracion_minutos }} minutos.
                  </p>
                  <strong>Infracciones acumuladas:</strong>
                  {{ resultadoAnalisis.moderacion.infracciones }}
                </div>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA: CÓMO SE PROCESÓ EL TEXTO -->
          <details class="right-column pipeline-disclosure">
            <summary>Explorar el procesamiento didáctico</summary>
            <div class="content-card nlp-pipeline-card">
              <h2 class="card-heading">Cómo se procesó el texto</h2>
              <p class="card-subheading">
                Visualización didáctica local. La clasificación y la moderación provienen del
                backend; la API no expone los pasos internos del modelo.
              </p>

              <div v-if="!pipelineNLP" class="pipeline-empty-state">
                <p>Analiza un comentario para ver cada paso.</p>
              </div>

              <div v-else class="pipeline-steps-container">
                <!-- TEXTO ORIGINAL -->
                <div class="pipeline-step">
                  <h4 class="step-title step-original">Texto original</h4>
                  <div class="raw-text-box">
                    {{ pipelineNLP.textoOriginal }}
                  </div>
                </div>

                <!-- 1 - NORMALIZACIÓN -->
                <div class="pipeline-step">
                  <h4 class="step-title">1 · Normalización</h4>
                  <p class="step-desc">
                    Demostración local: minúsculas, URLs y menciones sustituidas por etiquetas,
                    eliminación de números y puntuación, y sustitución de emojis conocidos.
                  </p>
                  <div class="code-step-box">
                    {{ pipelineNLP.normalizacion }}
                  </div>
                </div>

                <!-- 2 - TOKENIZACIÓN -->
                <div class="pipeline-step">
                  <h4 class="step-title">2 · Tokenización</h4>
                  <div class="tokens-cloud">
                    <span v-for="(token, i) in pipelineNLP.tokens" :key="i" class="token-pill">
                      {{ token }}
                    </span>
                  </div>
                </div>

                <!-- 3 - STOP WORDS -->
                <div class="pipeline-step">
                  <h4 class="step-title">3 · Stop words</h4>
                  <div class="stopwords-subgroup">
                    <span class="subgroup-label text-muted">Eliminadas:</span>
                    <div class="tokens-cloud">
                      <span
                        v-for="(sw, i) in pipelineNLP.stopWordsEliminadas"
                        :key="i"
                        class="token-pill pill-removed"
                      >
                        {{ sw }}
                      </span>
                      <span
                        v-if="pipelineNLP.stopWordsEliminadas.length === 0"
                        class="empty-inline-note"
                        >Ninguna</span
                      >
                    </div>
                  </div>

                  <div class="stopwords-subgroup">
                    <span class="subgroup-label text-preserved">Se conservan:</span>
                    <div class="tokens-cloud">
                      <span
                        v-for="(tok, i) in pipelineNLP.tokensConservados"
                        :key="i"
                        class="token-pill pill-preserved"
                      >
                        {{ tok }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="pipeline-step">
                  <h4 class="step-title">4 · Lematización aproximada (local)</h4>
                  <p class="step-desc">
                    Ejemplo mediante diccionario y reglas de sufijos. No es la salida interna del
                    modelo.
                  </p>
                  <div class="tokens-cloud">
                    <span v-for="(lema, i) in pipelineNLP.lemas" :key="i" class="token-pill"
                      >{{ pipelineNLP.tokensConservados[i] }} → {{ lema }}</span
                    >
                    <span v-if="!pipelineNLP.lemas.length" class="empty-inline-note"
                      >No hay términos conservados.</span
                    >
                  </div>
                </div>
                <div class="pipeline-step">
                  <h4 class="step-title">5 · N-gramas y vectorización TF-IDF</h4>
                  <p class="step-desc">
                    Ejemplos locales de términos y pares de palabras. La API no devuelve el vector
                    ni los pesos TF-IDF reales.
                  </p>
                  <span class="subgroup-label">Unigramas (hasta 10):</span>
                  <div class="tokens-cloud">
                    <span
                      v-for="termino in pipelineNLP.caracteristicasTFIDF.unigramas"
                      :key="termino"
                      class="token-pill"
                      >{{ termino }}</span
                    >
                  </div>
                  <span class="subgroup-label">Bigramas (hasta 6):</span>
                  <div class="tokens-cloud">
                    <span
                      v-for="(termino, i) in pipelineNLP.caracteristicasTFIDF.bigramas"
                      :key="i"
                      class="token-pill"
                      >{{ termino }}</span
                    >
                    <span
                      v-if="!pipelineNLP.caracteristicasTFIDF.bigramas.length"
                      class="empty-inline-note"
                      >No hay pares de palabras.</span
                    >
                  </div>
                </div>
                <div class="pipeline-step">
                  <h4 class="step-title">6 · Clasificación (backend)</h4>
                  <p v-if="resultadoAnalisis" class="step-desc">
                    Categoría: {{ resultadoAnalisis.categoria }} · Confianza:
                    {{ resultadoAnalisis.probabilidad }} · Margen:
                    {{ (resultadoAnalisis.margen * 100).toFixed(2) }} %.
                  </p>
                  <p v-else class="step-desc">Sin resultado del backend para este análisis.</p>
                </div>
                <div class="pipeline-step">
                  <h4 class="step-title">7 · Moderación (backend)</h4>
                  <template v-if="resultadoAnalisis?.moderacion">
                    <strong>{{ resultadoAnalisis.moderacion.estado }}</strong>
                    <p class="step-desc">{{ resultadoAnalisis.moderacion.mensaje }}</p>
                    <p class="step-desc">
                      Infracciones: {{ resultadoAnalisis.moderacion.infracciones }}.
                    </p>
                  </template>
                  <p v-else class="step-desc">Sin decisión del backend para este análisis.</p>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>

      <!-- ==================================================================== -->
      <!-- PESTAÑA 2: LOTE (Fiel a Imagen 1 y Imagen 2)                          -->
      <!-- ==================================================================== -->
      <div v-show="pestanaActiva === 'lote'" class="batch-view">
        <!-- TARJETA 1: ANALIZAR UN ARCHIVO -->
        <div class="content-card">
          <h2 class="card-heading">Analizar un archivo</h2>
          <p class="card-subheading">
            Un .txt con una reseña por línea, o un .csv con una columna llamada «texto». CSV de una
            sola columna, sin saltos dentro del texto. Máximo 500 reseñas y 1 MB. Cada análisis
            aplica las reglas de moderación de tu sesión.
          </p>

          <div class="file-input-action-row">
            <input
              ref="inputArchivoRef"
              type="file"
              accept=".txt,.csv"
              class="hidden-file-input"
              @change="manejarArchivoSeleccionado"
            />
            <button class="btn-choose-file" @click="dispararSeleccionArchivo">
              Seleccionar archivo
            </button>
            <span class="file-name-label">{{ nombreArchivo }}</span>

            <button
              class="btn-primary-classify"
              :disabled="cargandoLote || cargando || bloqueado"
              @click="clasificarArchivoLote"
            >
              <span v-if="cargandoLote" class="spinner"></span>
              {{ cargandoLote ? 'Clasificando...' : 'Clasificar' }}
            </button>
          </div>

          <p v-if="cargandoLote" role="status" class="batch-progress">
            Procesando: {{ resultadosLote.length }} comentarios analizados ·
            {{ filasOmitidas.length }} filas omitidas · {{ totalFilasLote }} líneas de archivo.
          </p>
          <div v-if="errorLote" class="error-banner" role="alert">{{ errorLote }}</div>
          <div class="sample-file-prompt">
            Prueba con
            <a href="javascript:void(0)" class="link-sample" @click="cargarEjemploLoteCsv"
              >ejemplo_lote.csv</a
            >.
          </div>
        </div>

        <!-- TARJETA 2 & 3 EN PARALELO (Resumen de Reseñas + Filas Omitidas) -->
        <div v-if="loteEjecutado" class="grid-lote-summary">
          <!-- TARJETA IZQUIERDA: RESEÑAS CLASIFICADAS -->
          <div class="content-card">
            <h3 class="card-subheading-bold">{{ statsLoteResumen.total }} reseñas clasificadas</h3>

            <div class="batch-bars-summary">
              <!-- Negativo -->
              <div class="batch-bar-row">
                <span class="batch-bar-label">Ofensivo (OFP/OFG)</span>
                <div class="batch-bar-track">
                  <div
                    class="batch-bar-fill bar-negativo"
                    :style="{ width: `${statsLoteResumen.pctNeg}%` }"
                  ></div>
                </div>
                <span class="batch-bar-count"
                  >{{ statsLoteResumen.neg }} ({{ statsLoteResumen.pctNeg }} %)</span
                >
              </div>

              <!-- Neutro -->
              <div class="batch-bar-row">
                <span class="batch-bar-label">Vulgar (NOE)</span>
                <div class="batch-bar-track">
                  <div
                    class="batch-bar-fill bar-neutro"
                    :style="{ width: `${statsLoteResumen.pctNeu}%` }"
                  ></div>
                </div>
                <span class="batch-bar-count"
                  >{{ statsLoteResumen.neu }} ({{ statsLoteResumen.pctNeu }} %)</span
                >
              </div>

              <!-- Positivo -->
              <div class="batch-bar-row">
                <span class="batch-bar-label">No ofensivo (NO)</span>
                <div class="batch-bar-track">
                  <div
                    class="batch-bar-fill bar-positivo"
                    :style="{ width: `${statsLoteResumen.pctPos}%` }"
                  ></div>
                </div>
                <span class="batch-bar-count"
                  >{{ statsLoteResumen.pos }} ({{ statsLoteResumen.pctPos }} %)</span
                >
              </div>
            </div>

            <button class="btn-download-csv" @click="descargarResultadosLoteCsv">
              Descargar resultados (.csv)
            </button>
          </div>

          <!-- TARJETA DERECHA: FILAS OMITIDAS -->
          <div class="content-card">
            <h3 class="card-subheading-bold">Filas omitidas</h3>
            <p class="card-subheading-small">No cumplen la validación de la API.</p>

            <ul class="omitted-list">
              <li v-for="(om, idx) in filasOmitidas" :key="idx">
                • Fila {{ om.fila }}: {{ om.motivo }}
              </li>
              <li v-if="filasOmitidas.length === 0" class="text-muted">
                Ninguna fila omitida. Todas las filas fueron válidas.
              </li>
            </ul>
          </div>
        </div>

        <!-- TABLA RESULTADOS (Fiel a Imagen 2) -->
        <div v-if="loteEjecutado" class="content-card">
          <h2 class="card-heading-results">Resultados</h2>

          <div class="table-scroll">
            <table class="batch-results-table">
              <thead>
                <tr>
                  <th style="width: 70px">Fila</th>
                  <th>Texto</th>
                  <th style="width: 140px; text-align: center">Categoría / Moderación</th>
                  <th style="width: 120px; text-align: right">Probabilidad</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="res in resultadosLote" :key="res.fila">
                  <td class="text-muted">{{ res.fila }}</td>
                  <td class="text-review-cell">{{ res.texto }}</td>
                  <td style="text-align: center">
                    <span class="sentiment-pill" :class="'pill-' + res.sentimiento.toLowerCase()">
                      {{ res.sentimiento }} · {{ res.moderacion.estado }}
                    </span>
                  </td>
                  <td style="text-align: right" class="text-prob font-mono">
                    {{ res.probabilidad }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================================================================== -->
      <!-- PESTAÑA 3: MÉTRICAS (Fiel a Imágenes 3, 4 y 5)                       -->
      <!-- ==================================================================== -->
      <div v-show="pestanaActiva === 'metricas'" class="metrics-view">
        <!-- Estadísticas operativas: se obtienen de /api/estadisticas cada 5 segundos -->
        <div class="content-card">
          <div class="estadisticas-vivo-encabezado">
            <div>
              <h2 class="card-heading">Monitoreo en vivo de SocialTOX</h2>
              <p class="card-subheading">
                Datos reales de uso registrados por FastAPI · Actualización automática cada 5
                segundos.
              </p>
            </div>
            <button
              class="btn-primary-analyze"
              :disabled="cargandoEstadisticas"
              @click="cargarEstadisticas"
            >
              {{ cargandoEstadisticas ? 'Actualizando...' : 'Actualizar estadísticas' }}
            </button>
          </div>
          <p v-if="errorEstadisticas" class="error-banner" role="alert">
            {{ errorEstadisticas }}. Comprueba GET /api/estadisticas.
          </p>
          <template v-if="estadisticasVivo">
            <div class="production-kpis-grid">
              <div class="prod-kpi-box">
                <div class="prod-kpi-val">{{ totalVivo }}</div>
                <div class="prod-kpi-label">Comentarios analizados</div>
              </div>
              <div class="prod-kpi-box">
                <div class="prod-kpi-val">{{ estadisticasVivo.comentarios_ofensivos }}</div>
                <div class="prod-kpi-label">Comentarios OFP + OFG</div>
              </div>
              <div class="prod-kpi-box">
                <div class="prod-kpi-val">{{ estadisticasVivo.infracciones_registradas }}</div>
                <div class="prod-kpi-label">Infracciones registradas*</div>
              </div>
              <div class="prod-kpi-box">
                <div class="prod-kpi-val">{{ estadisticasVivo.restricciones_aplicadas }}</div>
                <div class="prod-kpi-label">Restricciones aplicadas</div>
              </div>
              <div class="prod-kpi-box">
                <div class="prod-kpi-val">
                  {{ Number(estadisticasVivo.latencia_promedio_ms || 0).toFixed(2) }} ms
                </div>
                <div class="prod-kpi-label">Latencia media de análisis</div>
              </div>
            </div>
            <h3 class="card-subheading-bold" style="margin-top: 22px">
              Distribución de clasificaciones registradas
            </h3>
            <div v-for="cat in categoriasVivo" :key="cat" class="estadisticas-categoria-fila">
              <div class="estadisticas-categoria-titulo">
                <span>{{ cat }} · {{ CATEGORIAS_INFO[cat]?.nombre || cat }}</span>
                <span>{{ conteoCategoriaVivo(cat) }} ({{ porcentajeCategoriaVivo(cat) }} %)</span>
              </div>
              <div class="estadisticas-barra-fondo">
                <div
                  class="estadisticas-barra"
                  :style="{ width: porcentajeCategoriaVivo(cat) + '%' }"
                ></div>
              </div>
            </div>
            <p class="card-subheading" style="margin-top: 16px; margin-bottom: 0">
              Última actualización: {{ actualizadasEstadisticas }}. Contadores en memoria: se
              reinician cuando FastAPI se reinicia. *El conteo de infracciones depende de los
              estados definidos en estadisticas_store.py.
            </p>
          </template>
          <p v-else-if="!cargandoEstadisticas" class="card-subheading">
            Todavía no se han recibido estadísticas del backend.
          </p>
        </div>
        <div class="content-card">
          <div
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
              flex-wrap: wrap;
              margin-bottom: 12px;
            "
          >
            <h2 class="card-heading">Evaluación real de OffendES</h2>
            <button
              class="btn-primary-analyze"
              :disabled="cargandoMetricas"
              @click="cargarMetricas"
            >
              {{ cargandoMetricas ? 'Cargando...' : 'Actualizar desde FastAPI' }}
            </button>
          </div>
          <p v-if="errorMetricas" class="error-banner" role="alert">
            {{ errorMetricas }} Los resultados visibles, si existen, corresponden a la última
            consulta correcta.
          </p>
          <p v-if="!metricasBackend" class="card-subheading">
            {{
              cargandoMetricas
                ? 'Consultando /api/metricas...'
                : 'Sin resultados. Comprueba el backend y pulsa Actualizar desde FastAPI.'
            }}
          </p>
          <template v-if="metricasBackend">
            <p class="card-subheading">
              Fuente: resultados_modelos.json · Conjunto {{ metricasBackend.conjunto }} ·
              {{ metricasBackend.total_comentarios.toLocaleString('es-BO') }} comentarios ·
              Categorías: {{ categoriasEvaluacion.join(', ') }}.
            </p>
            <p class="metrics-info-note">
              Evaluación histórica guardada (GET /api/metricas). Los indicadores de uso en vivo se
              muestran arriba; la exactitud y el F1 requieren etiquetas reales y no cambian con cada
              nuevo comentario.
            </p>
            <div class="production-kpis-grid">
              <div class="prod-kpi-box">
                <div class="prod-kpi-val">
                  {{ porcentajeEvaluacion(modelosEvaluados.regresion_logistica.accuracy) }}
                </div>
                <div class="prod-kpi-label">Exactitud · Regresión logística</div>
              </div>
              <div class="prod-kpi-box">
                <div class="prod-kpi-val">
                  {{ porcentajeEvaluacion(modelosEvaluados.regresion_logistica.f1_macro) }}
                </div>
                <div class="prod-kpi-label">F1 macro · Regresión logística</div>
              </div>
              <div class="prod-kpi-box">
                <div class="prod-kpi-val">
                  {{ porcentajeEvaluacion(modelosEvaluados.xgboost.accuracy) }}
                </div>
                <div class="prod-kpi-label">Exactitud · XGBoost</div>
              </div>
              <div class="prod-kpi-box">
                <div class="prod-kpi-val">
                  {{ porcentajeEvaluacion(modelosEvaluados.xgboost.f1_macro) }}
                </div>
                <div class="prod-kpi-label">F1 macro · XGBoost</div>
              </div>
            </div>
          </template>
        </div>

        <template v-if="metricasBackend">
          <div class="content-card">
            <h2 class="card-heading">Comparación de modelos evaluados</h2>
            <p class="card-subheading">Resultados observados sobre el mismo conjunto de prueba.</p>
            <div class="table-scroll">
              <table class="metrics-comparison-table">
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Exactitud</th>
                    <th>F1 macro</th>
                    <th>Precisión macro</th>
                    <th>Recall macro</th>
                    <th>F1 NO</th>
                    <th>F1 NOE</th>
                    <th>F1 OFG</th>
                    <th>F1 OFP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in modelosDisponibles" :key="m.clave">
                    <td class="font-bold">{{ m.nombre }}</td>
                    <td class="font-mono">
                      {{ porcentajeEvaluacion(modelosEvaluados[m.clave].accuracy) }}
                    </td>
                    <td class="font-mono">
                      {{ porcentajeEvaluacion(modelosEvaluados[m.clave].f1_macro) }}
                    </td>
                    <td class="font-mono">
                      {{ porcentajeEvaluacion(modelosEvaluados[m.clave].precision_macro) }}
                    </td>
                    <td class="font-mono">
                      {{ porcentajeEvaluacion(modelosEvaluados[m.clave].recall_macro) }}
                    </td>
                    <td v-for="cat in categoriasEvaluacion" :key="cat" class="font-mono">
                      {{ tresDecimales(modelosEvaluados[m.clave].f1_por_clase[cat]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="content-card">
            <h2 class="card-heading">Matriz de confusión y métricas por clase</h2>
            <p class="card-subheading">
              Filas: etiqueta real · Columnas: etiqueta predicha. Cada matriz utiliza las cuatro
              categorías de OffendES.
            </p>
            <div class="model-pills-row">
              <button
                v-for="m in modelosDisponibles"
                :key="m.clave"
                class="model-pill-btn"
                :class="{ active: modeloConfusionActivo === m.clave }"
                @click="modeloConfusionActivo = m.clave"
              >
                {{ m.nombre }}
              </button>
            </div>
            <div class="table-scroll" style="margin-bottom: 24px">
              <table class="confusion-matrix-table" style="width: 100%; min-width: 530px">
                <thead>
                  <tr>
                    <th class="matrix-axis-header">Real ↓ / Predicho →</th>
                    <th v-for="cat in categoriasEvaluacion" :key="cat">{{ cat }}</th>
                    <th>Total real</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(fila, i) in matrizEvaluacion" :key="categoriasEvaluacion[i]">
                    <td class="matrix-class-row-header">{{ categoriasEvaluacion[i] }}</td>
                    <td
                      v-for="(valor, j) in fila"
                      :key="j"
                      class="confusion-cell"
                      :class="{
                        'diag-green-dark': i === j && valor > 150,
                        'diag-green-medium': i === j && valor <= 150 && valor > 0,
                        'offdiag-pink': i !== j && valor > 0,
                        'offdiag-zero': valor === 0,
                      }"
                    >
                      {{ valor }}
                    </td>
                    <td class="font-mono">{{ fila.reduce((total, valor) => total + valor, 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3 class="card-subheading-bold">Reporte de clasificación por categoría</h3>
            <div class="table-scroll">
              <table class="class-metrics-table" style="width: 100%">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Precisión</th>
                    <th>Recall</th>
                    <th>F1</th>
                    <th>Soporte</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="cat in categoriasEvaluacion" :key="cat">
                    <td class="font-bold">{{ cat }}</td>
                    <td class="font-mono">{{ tresDecimales(reporteEvaluacion[cat].precision) }}</td>
                    <td class="font-mono">{{ tresDecimales(reporteEvaluacion[cat].recall) }}</td>
                    <td class="font-mono">
                      {{ tresDecimales(reporteEvaluacion[cat]['f1-score']) }}
                    </td>
                    <td class="font-mono">{{ reporteEvaluacion[cat].support }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="content-card">
            <h2 class="card-heading">Alcance de los resultados</h2>
            <p class="card-subheading">
              Este archivo JSON no contiene métricas de validación cruzada, hiperparámetros,
              análisis del efecto de stop words, n-gramas ni comparaciones con Naive Bayes o una
              línea base. Estas secciones de demostración se sustituyeron para no presentar números
              inventados como resultados reales.
            </p>
            <p class="card-subheading">
              Para actualizar estas métricas, actualiza resultados/resultados_modelos.json en el
              servidor y pulsa «Actualizar desde FastAPI».
            </p>
          </div>
        </template>
      </div>

      <!-- ==================================================================== -->
      <!-- PESTAÑA 4: DATOS (EXPLORADOR DATASET)                                 -->
      <!-- ==================================================================== -->
      <div v-show="pestanaActiva === 'datos'" class="dataset-view">
        <div class="content-card">
          <h2 class="card-heading">Explorador de Datos</h2>
          <p class="card-subheading">
            Muestras incluidas en el módulo local de datos; verifica su procedencia antes de
            tratarlas como datos de entrenamiento reales.
          </p>

          <div class="dataset-toolbar">
            <select v-model="filtroDatos" aria-label="Filtrar muestras">
              <option value="TODOS">Todas las categorías</option>
              <option v-for="cat in categoriasVivo" :key="cat">{{ cat }}</option>
            </select>
            <div class="search-input-wrapper">
              <input
                v-model="busquedaDatos"
                type="text"
                aria-label="Buscar muestras"
                placeholder="Buscar ejemplos..."
                class="search-input"
              />
            </div>
          </div>

          <p v-if="!muestrasDatosFiltradas.length" class="empty-state-card">
            No hay muestras para estos filtros.
          </p>
          <div class="samples-list">
            <div v-for="m in muestrasDatosFiltradas" :key="m.id" class="sample-item">
              <div class="sample-left">
                <span class="sentiment-pill" :class="'pill-' + m.categoria.toLowerCase()"
                  >{{ m.categoria }} · {{ CATEGORIAS_INFO[m.categoria].nombre }}</span
                >
                <p class="sample-text">"{{ m.texto }}"</p>
                <p class="sample-reason text-muted">{{ m.explicacion }}</p>
              </div>
              <div>
                <button class="btn-sm-test" @click="probarMuestraEnAnalizador(m.texto)">
                  Probar en Analizador ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================================================================== -->
      <!-- PESTAÑA 5: HISTORIAL                                                 -->
      <!-- ==================================================================== -->
      <div v-show="pestanaActiva === 'historial'" class="history-view">
        <div class="content-card">
          <div class="card-header-flex">
            <div>
              <h2 class="card-heading">Historial de Análisis</h2>
              <p class="card-subheading">
                Análisis de esta página. Se borra al recargar. Reevaluar realiza un nuevo análisis y
                puede aplicar moderación.
              </p>
            </div>
            <button
              v-if="historialAnalisis.length"
              class="btn-danger-outline"
              @click="limpiarHistorial"
            >
              Limpiar historial
            </button>
          </div>

          <div class="dataset-toolbar">
            <input
              v-model="busquedaHistorial"
              class="search-input"
              aria-label="Buscar historial"
              placeholder="Buscar comentario..."
            /><select v-model="filtroHistorial" aria-label="Filtrar historial">
              <option value="TODOS">Todas las categorías</option>
              <option v-for="cat in categoriasVivo" :key="cat">{{ cat }}</option>
            </select>
          </div>
          <p v-if="historialAnalisis.length && !historialFiltrado.length" class="empty-state-card">
            No hay resultados para estos filtros.
          </p>
          <div v-if="historialFiltrado.length" class="table-scroll">
            <table class="batch-results-table">
              <thead>
                <tr>
                  <th style="width: 100px">Hora</th>
                  <th>Texto</th>
                  <th style="width: 140px; text-align: center">Categoría / Moderación</th>
                  <th style="width: 120px; text-align: right">Probabilidad</th>
                  <th style="width: 100px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in historialFiltrado" :key="h.id">
                  <td class="text-muted font-mono">{{ h.fecha || h.hora }}</td>
                  <td class="text-review-cell">{{ h.comentario }}</td>
                  <td style="text-align: center">
                    <span class="sentiment-pill" :class="'pill-' + h.categoria.toLowerCase()">
                      {{ h.categoria }} · {{ h.estadoMod }}
                    </span>
                  </td>
                  <td style="text-align: right" class="font-mono text-prob">
                    {{ h.probabilidad }}
                  </td>
                  <td>
                    <button class="btn-text-action" @click="detalleHistorial = h">Detalles</button
                    ><button
                      class="btn-text-action"
                      :disabled="bloqueado || cargando || cargandoLote"
                      @click="probarMuestraEnAnalizador(h.comentario)"
                    >
                      Reevaluar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="!historialAnalisis.length" class="empty-state-card">
            No hay registros en el historial todavía.
          </div>
        </div>
      </div>

      <dialog
        ref="dialogoDetalle"
        class="detail-dialog"
        aria-label="Detalle del análisis"
        @cancel="detalleHistorial = null"
        @close="detalleHistorial = null"
      >
        <template v-if="detalleHistorial"
          ><h2>Detalle del análisis</h2>
          <p>{{ detalleHistorial.fecha }}</p>
          <blockquote class="result-quote">{{ detalleHistorial.comentario }}</blockquote>
          <p>{{ detalleHistorial.categoria }} · Confianza {{ detalleHistorial.probabilidad }}</p>
          <p>{{ detalleHistorial.detalle.moderacion.mensaje }}</p>
          <p v-for="(prob, cat) in detalleHistorial.detalle.probabilidades" :key="cat">
            {{ cat }}: {{ (prob * 100).toFixed(2) }} %
          </p>
          <button class="btn-primary-analyze" @click="detalleHistorial = null">
            Cerrar detalle
          </button></template
        >
      </dialog>
    </main>

    <!-- PIE DE PÁGINA (Fiel a Imagen 1, 2, 3...) -->
    <footer class="app-footer">
      <div class="footer-content">
        Proyecto Integrador · Clasificación y moderación desde FastAPI ·
        <a :href="`${API_URL.replace(/\/api$/, '')}/docs`" target="_blank" class="footer-link"
          >/api/docs</a
        >
      </div>
    </footer>
  </div>
</template>
