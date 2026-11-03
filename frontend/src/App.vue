<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { procesarPipelineNLP } from './utils/nlpPipeline'
import {
  CATEGORIAS_INFO,
  ACCIONES_INFO,
  EJEMPLOS_PRUEBA,
  MUESTRAS_DATASET
} from './utils/datasetOffendES'
import { EJEMPLO_LOTE_DATOS } from './utils/metricasData'

// --- ESTADO GENERAL Y NAVEGACIÓN ---
const pestanaActiva = ref('analizar') // 'analizar' | 'lote' | 'metricas' | 'datos' | 'historial'
const apiConectada = ref(false)
// Por defecto se conecta directamente al FastAPI de SocialTOX (puerto 8000).
// Se puede sobrescribir con VITE_API_URL=http://localhost:8000/api.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '')
const sesionLista = ref(false)
let promesaSesion = null
const ahora = ref(Date.now())
const verificacionPendiente = ref(false)
const restriccionActiva = ref(null)
const segundosRestantes = computed(() => {
  const fin = Date.parse(restriccionActiva.value?.fecha_fin || '')
  return Number.isFinite(fin) ? Math.max(0, Math.ceil((fin - ahora.value) / 1000)) : 0
})
// Aunque el reloj llegue a cero, no se desbloquea hasta confirmar con FastAPI.
const bloqueado = computed(() => !!restriccionActiva.value)
const tiempoFormateado = computed(() => {
  const m = Math.floor(segundosRestantes.value / 60)
  const s = segundosRestantes.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const duracionRestriccion = ref(0)
const progresoRestriccion = computed(() => duracionRestriccion.value
  ? Math.min(100, Math.max(0, segundosRestantes.value / duracionRestriccion.value * 100))
  : 0)
let reloj
let comprobandoVencimiento = false

function actualizarRestriccion(data) {
  if (typeof data?.infracciones === 'number') infraccionesSesion.value = data.infracciones
  if (data?.estado !== 'RESTRINGIDO') {
    restriccionActiva.value = null
    duracionRestriccion.value = 0
    verificacionPendiente.value = false
    return
  }
  const fin = Date.parse(data.fecha_fin || '')
  const resto = Number(data.tiempo_restante_segundos ?? (data.duracion_minutos ?? 0) * 60)
  // El backend envía fecha_fin; conservarla para evitar desbloqueo por refresco.
  const fecha_fin = Number.isFinite(fin) ? data.fecha_fin : new Date(Date.now() + Math.max(0, resto) * 1000).toISOString()
  restriccionActiva.value = { ...data, fecha_fin, mensaje: data.mensaje || 'Tienes una restricción activa.' }
  ahora.value = Date.now()
  duracionRestriccion.value = Math.max(duracionRestriccion.value, segundosRestantes.value)
  verificacionPendiente.value = segundosRestantes.value === 0
}

// --- PESTAÑA: ANALIZAR ---
const comentario = ref('')
const cargando = ref(false)
const errorAnalisis = ref('')
const infraccionesSesion = ref(0)
const resultadoAnalisis = ref(null)
const pipelineNLP = ref(null)
const latenciaMs = ref(null)

// --- PESTAÑA: LOTE (Imágenes 1 y 2) ---
const archivoSeleccionado = ref(null)
const nombreArchivo = ref('ejemplo_lote.csv')
const cargandoLote = ref(false)
const loteEjecutado = ref(false)
const errorLote = ref('')
const filasOmitidas = ref([])
const resultadosLote = ref([])
const inputArchivoRef = ref(null)

// --- PESTAÑA: MÉTRICAS ---
// Se obtienen directamente del endpoint GET /api/metricas de FastAPI.
const metricasBackend = ref(null)
const cargandoMetricas = ref(false)
const errorMetricas = ref('')
const modeloConfusionActivo = ref('regresion_logistica')
const nombresModelos = {
  regresion_logistica: 'Regresión logística',
  xgboost: 'XGBoost'
}
const modelosDisponibles = computed(() => Object.keys(metricasBackend.value?.modelos || {})
  .map(clave => ({ clave, nombre: nombresModelos[clave] || clave })))
const categoriasEvaluacion = computed(() => metricasBackend.value?.categorias || [])
const modelosEvaluados = computed(() => metricasBackend.value?.modelos || {})
const modeloEvaluadoActual = computed(() => modelosEvaluados.value[modeloConfusionActivo.value] || null)
const porcentajeEvaluacion = valor => Number.isFinite(Number(valor)) ? `${(Number(valor) * 100).toFixed(2)} %` : '—'
const tresDecimales = valor => Number.isFinite(Number(valor)) ? Number(valor).toFixed(3) : '—'
const matrizEvaluacion = computed(() => modeloEvaluadoActual.value?.matriz_confusion || [])
const reporteEvaluacion = computed(() => modeloEvaluadoActual.value?.reporte || {})

async function cargarMetricas() {
  if (cargandoMetricas.value) return
  cargandoMetricas.value = true
  errorMetricas.value = ''
  try {
    // Se evita mostrar métricas antiguas si falla la actualización.
    const datos = await solicitarAPI('/metricas')
    if (!datos?.modelos || !Array.isArray(datos.categorias) || !datos.total_comentarios) {
      throw new Error('La API devolvió un formato de métricas inesperado.')
    }
    metricasBackend.value = datos
    if (!datos.modelos[modeloConfusionActivo.value]) {
      modeloConfusionActivo.value = Object.keys(datos.modelos)[0] || ''
    }
  } catch (err) {
    errorMetricas.value = err.message
  } finally {
    cargandoMetricas.value = false
  }
}

// --- ESTADÍSTICAS DE USO EN VIVO (independientes de las métricas de evaluación) ---
const estadisticasVivo = ref(null)
const cargandoEstadisticas = ref(false)
const errorEstadisticas = ref('')
const actualizadasEstadisticas = ref(null)
let intervaloEstadisticas = null
const categoriasVivo = ['NO', 'NOE', 'OFG', 'OFP']
const totalVivo = computed(() => Number(estadisticasVivo.value?.total_comentarios || 0))
const conteoCategoriaVivo = cat => Number(estadisticasVivo.value?.categorias?.[cat] || 0)
const porcentajeCategoriaVivo = cat => totalVivo.value > 0
  ? (conteoCategoriaVivo(cat) / totalVivo.value * 100).toFixed(1)
  : '0.0'

async function cargarEstadisticas() {
  if (cargandoEstadisticas.value) return
  cargandoEstadisticas.value = true
  try {
    const datos = await solicitarAPI('/estadisticas')
    if (!datos || typeof datos.total_comentarios !== 'number' || !datos.categorias) {
      throw new Error('La API devolvió un formato de estadísticas inesperado.')
    }
    estadisticasVivo.value = datos
    actualizadasEstadisticas.value = new Date().toLocaleTimeString('es-BO')
    errorEstadisticas.value = ''
  } catch (err) {
    errorEstadisticas.value = err.message
  } finally {
    cargandoEstadisticas.value = false
  }
}

// --- PESTAÑA: DATOS ---
const filtroDatos = ref('TODOS')
const busquedaDatos = ref('')

// --- PESTAÑA: HISTORIAL ---
const historialAnalisis = ref([])
const filtroHistorial = ref('TODOS')

// Cookies de sesión compartidas entre las solicitudes al mismo backend.
async function solicitarAPI(ruta, opciones = {}) {
  let respuesta
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      credentials: 'include',
      signal: AbortSignal.timeout(30000)
    })
  } catch (err) {
    apiConectada.value = false
    throw new Error(err.name === 'TimeoutError'
      ? 'El servidor tardó demasiado. Comprueba el estado de sesión antes de reintentar.'
      : 'No se pudo conectar con FastAPI. Comprueba que funcione en http://localhost:8000.')
  }
  apiConectada.value = respuesta.status < 500
  const datos = await respuesta.json().catch(() => null)
  if (respuesta.status === 429) {
    if (datos?.detail && typeof datos.detail === 'object') actualizarRestriccion({ ...datos.detail, estado: 'RESTRINGIDO' })
    throw new Error(datos?.detail?.mensaje || 'Tienes una restricción activa.')
  }
  if (!respuesta.ok) {
    throw new Error(typeof datos?.detail === 'string' ? datos.detail
      : datos?.detail?.mensaje || `El backend respondió con error ${respuesta.status}.`)
  }
  if (!datos) throw new Error('La API no devolvió una respuesta JSON válida.')
  return datos
}

async function verificarSesionBackend() {
  if (!promesaSesion) {
    promesaSesion = solicitarAPI('/sesion').then(data => {
      actualizarRestriccion(data)
      sesionLista.value = true
      return data
    }).finally(() => { promesaSesion = null })
  }
  return promesaSesion
}

async function verificarFinRestriccion() {
  if (comprobandoVencimiento) return
  comprobandoVencimiento = true
  verificacionPendiente.value = true
  try {
    await verificarSesionBackend()
    errorAnalisis.value = ''
  } catch (err) {
    errorAnalisis.value = 'No se pudo comprobar el fin de la restricción. ' + err.message
  } finally {
    comprobandoVencimiento = false
  }
}

onMounted(async () => {
  reloj = setInterval(() => {
    ahora.value = Date.now()
    if (bloqueado.value && segundosRestantes.value === 0 && !verificacionPendiente.value) {
      void verificarFinRestriccion()
    }
  }, 1000)
  try { await verificarSesionBackend() }
  catch (err) { errorAnalisis.value = err.message }
  void cargarMetricas()
  void cargarEstadisticas()
  intervaloEstadisticas = setInterval(() => { void cargarEstadisticas() }, 5000)
})
onUnmounted(() => {
  clearInterval(reloj)
  if (intervaloEstadisticas !== null) clearInterval(intervaloEstadisticas)
})

function cargarEjemplo(texto) {
  if (cargando.value || cargandoLote.value) return
  comentario.value = texto
}

async function consultarModelo(texto) {
  if (!sesionLista.value) await verificarSesionBackend()
  const pred = await solicitarAPI('/analizar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comentario: texto })
  })
  if (!pred.categoria_predicha || !pred.probabilidades || !pred.moderacion) {
    throw new Error('La respuesta no contiene la clasificación y moderación esperadas.')
  }
  const mod = pred.moderacion
  actualizarRestriccion(mod)
  const resultado = {
    texto, categoria: pred.categoria_predicha,
    probabilidad: (pred.probabilidades[pred.categoria_predicha] * 100).toFixed(2) + ' %',
    probabilidades: pred.probabilidades, margen: pred.margen, moderacion: mod
  }
  historialAnalisis.value.unshift({
    id: Date.now(), hora: new Date().toLocaleTimeString(), comentario: texto,
    categoria: resultado.categoria, probabilidad: resultado.probabilidad,
    estadoMod: mod.estado
  })
  return resultado
}

async function analizarTextoActual() {
  if (cargando.value || cargandoLote.value || bloqueado.value) return
  const texto = comentario.value.trim()
  if (!texto) { errorAnalisis.value = 'Escribe un comentario antes de analizar.'; return }
  cargando.value = true
  errorAnalisis.value = ''
  resultadoAnalisis.value = null
  const inicio = performance.now()
  try {
    pipelineNLP.value = procesarPipelineNLP(texto)
    resultadoAnalisis.value = await consultarModelo(texto)
    void cargarEstadisticas()
    latenciaMs.value = Math.round(performance.now() - inicio)
  } catch (error) {
    errorAnalisis.value = error.message
  } finally { cargando.value = false }
}

function limpiarAnalizador() {
  comentario.value = ''
  resultadoAnalisis.value = null
  pipelineNLP.value = null
  errorAnalisis.value = ''
}

// --- FUNCIONALIDAD PESTAÑA: LOTE (Imágenes 1 y 2) ---
function cargarEjemploLoteCsv() {
  archivoSeleccionado.value = new File([EJEMPLO_LOTE_DATOS.map(r => r.texto).join('\n')], 'ejemplo_lote.txt', { type: 'text/plain' })
  nombreArchivo.value = 'ejemplo_lote.txt'
}

function dispararSeleccionArchivo() {
  if (inputArchivoRef.value) {
    inputArchivoRef.value.click()
  }
}

function manejarArchivoSeleccionado(evento) {
  const archivo = evento.target.files[0]
  if (!archivo) return

  archivoSeleccionado.value = archivo
  nombreArchivo.value = archivo.name
}

async function clasificarArchivoLote() {
  if (cargando.value || cargandoLote.value || bloqueado.value) return
  if (!archivoSeleccionado.value) cargarEjemploLoteCsv()
  errorLote.value = ''
  if (archivoSeleccionado.value.size > 1024 * 1024) {
    errorLote.value = 'El archivo supera 1 MB.'; return
  }
  cargandoLote.value = true
  resultadosLote.value = []
  filasOmitidas.value = []
  loteEjecutado.value = true
  try {
    const lineas = (await archivoSeleccionado.value.text()).split(/\r?\n/)
    const inicio = lineas[0]?.replace(/^\uFEFF/, '').trim().toLowerCase() === 'texto' ? 1 : 0
    if (lineas.length - inicio > 500) throw new Error('El archivo supera las 500 líneas.')
    for (let i = inicio; i < lineas.length; i++) {
      const texto = lineas[i].trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"')
      if (!texto) {
        filasOmitidas.value.push({ fila: i + 1, motivo: 'Texto vacío.' }); continue
      }
      if (bloqueado.value) throw new Error('Lote detenido por la restricción de la sesión. Las filas restantes no se enviaron.')
      const res = await consultarModelo(texto)
      resultadosLote.value.push({ fila: i + 1, texto, sentimiento: res.categoria, probabilidad: res.probabilidad, moderacion: res.moderacion })
    }
  } catch (error) { errorLote.value = error.message }
  finally { cargandoLote.value = false; void cargarEstadisticas() }
}

// Resumen del Lote clasificado
const statsLoteResumen = computed(() => {
  const total = resultadosLote.value.length
  if (total === 0) return { total: 0, neg: 0, neu: 0, pos: 0, pctNeg: 0, pctNeu: 0, pctPos: 0 }

  const neg = resultadosLote.value.filter(r => ['OFP', 'OFG'].includes(r.sentimiento)).length
  const neu = resultadosLote.value.filter(r => r.sentimiento === 'NOE').length
  const pos = resultadosLote.value.filter(r => r.sentimiento === 'NO').length

  return {
    total,
    neg,
    neu,
    pos,
    pctNeg: Math.round((neg / total) * 100),
    pctNeu: Math.round((neu / total) * 100),
    pctPos: Math.round((pos / total) * 100)
  }
})

function descargarResultadosLoteCsv() {
  if (resultadosLote.value.length === 0) return
  const headers = ['Fila', 'Texto', 'Categoría', 'Probabilidad']
  const filas = resultadosLote.value.map(r =>
    `"${r.fila}";"${r.texto.replace(/"/g, '""')}";"${r.sentimiento}";"${r.probabilidad}"`
  )
  const csvContent = [headers.join(';'), ...filas].join('\n')
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'resultados_clasificacion_lote.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// --- PESTAÑA: DATOS ---
const muestrasDatosFiltradas = computed(() => {
  return MUESTRAS_DATASET.filter(m => {
    const coincideFiltro = filtroDatos.value === 'TODOS' || m.categoria === filtroDatos.value
    const coincideBusqueda = !busquedaDatos.value.trim() ||
      m.texto.toLowerCase().includes(busquedaDatos.value.toLowerCase()) ||
      m.explicacion.toLowerCase().includes(busquedaDatos.value.toLowerCase())
    return coincideFiltro && coincideBusqueda
  })
})

function probarMuestraEnAnalizador(texto) {
  comentario.value = texto
  pestanaActiva.value = 'analizar'
  analizarTextoActual()
}

// --- PESTAÑA: HISTORIAL ---
function limpiarHistorial() {
  historialAnalisis.value = []
}
</script>

<template>
  <div class="app-layout">
    <!-- ENCABEZADO SUPERIOR (Exacto como en las imágenes) -->
    <header class="top-nav">
      <div class="nav-container">
        <div class="brand-group">
          <div>
            <h1 class="brand-title">SocialTOX</h1>
            <p class="brand-subtitle">Detección y moderación de lenguaje ofensivo en español</p>
          </div>
        </div>

        <!-- BADGE ESTADO (Conexión visible al backend) -->
        <div class="system-status-pill" :class="{ 'connected-pill': apiConectada }">
          <span class="status-indicator-dot" :class="{ 'dot-online': apiConectada }"></span>
          OffendES · {{ apiConectada ? 'API conectada' : 'API sin conexión' }}
        </div>
      </div>

      <!-- BARRA DE PESTAÑAS (TABS) -->
      <nav class="tabs-bar">
        <div class="tabs-container">
          <button
            class="tab-btn"
            :class="{ active: pestanaActiva === 'analizar' }"
            @click="pestanaActiva = 'analizar'"
          >
            Analizar
          </button>
          <button
            class="tab-btn"
            :class="{ active: pestanaActiva === 'lote' }"
            @click="pestanaActiva = 'lote'"
          >
            Lote
          </button>
          <button
            class="tab-btn"
            :class="{ active: pestanaActiva === 'metricas' }"
            @click="pestanaActiva = 'metricas'"
          >
            Métricas
          </button>
          <button
            class="tab-btn"
            :class="{ active: pestanaActiva === 'datos' }"
            @click="pestanaActiva = 'datos'"
          >
            Datos
          </button>
          <button
            class="tab-btn"
            :class="{ active: pestanaActiva === 'historial' }"
            @click="pestanaActiva = 'historial'"
          >
            Historial
          </button>
        </div>
      </nav>
    </header>

    <!-- CONTENIDO PRINCIPAL -->
    <main class="main-body">
      <div class="session-status-note" role="status">Infracciones acumuladas: <strong>{{ infraccionesSesion }}</strong></div>
      <section v-if="bloqueado" class="aviso-restriccion" role="alert" aria-live="polite">
        <div class="restriccion-cabecera">
          <strong>Restricción activa</strong>
          <span class="restriccion-etiqueta">RESTRINGIDO</span>
        </div>
        <p>{{ restriccionActiva.mensaje }}</p>
        <p>Infracciones acumuladas: <strong>{{ infraccionesSesion }}</strong></p>
        <div class="restriccion-tiempo">{{ tiempoFormateado }}</div>
        <div class="restriccion-barra-fondo">
          <div class="restriccion-barra" :style="{ width: `${progresoRestriccion}%` }"></div>
        </div>
        <p v-if="segundosRestantes > 0">El análisis individual y por lotes está bloqueado hasta finalizar la restricción.</p>
        <p v-else>El tiempo terminó. Se necesita confirmar con FastAPI que la sesión está habilitada.</p>
        <button v-if="segundosRestantes === 0" class="btn-comprobar" :disabled="comprobandoVencimiento" @click="verificarFinRestriccion">
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
              <p class="card-subheading">El modelo OffendES detecta lenguaje ofensivo y aplica la moderación de tu sesión.</p>

              <div class="input-wrapper">
                <textarea
                  v-model="comentario"
                  class="comment-textarea"
                  rows="4"
                  maxlength="1000"
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
                    {{ cargando ? 'Analizando...' : (bloqueado ? 'Análisis bloqueado' : 'Analizar') }}
                  </button>
                </div>
              </div>

              <!-- CHIPS PROBAR CON (Ejemplos conectados a OffendES) -->
              <div class="sample-pills-row">
                <span class="sample-label">Probar con:</span>
                <div class="chips-container">
                  <button class="sample-chip" @click="cargarEjemplo('Eres una estúpida e inútil, no sirves para nada cállate ya')">
                    Insulto directo (OFP)
                  </button>
                  <button class="sample-chip" @click="cargarEjemplo('Todos esos inmigrantes deberían ser expulsados del país inmediatamente')">
                    Odio grupal (OFG)
                  </button>
                  <button class="sample-chip" @click="cargarEjemplo('No mames qué calor de mierda hace hoy en la calle')">
                    Vulgar no ofensivo (NOE)
                  </button>
                  <button class="sample-chip" @click="cargarEjemplo('Muchas gracias por compartir este material tan útil y formativo')">
                    No ofensivo (NO)
                  </button>
                  <button class="sample-chip" @click="cargarEjemplo('El majadito estaba riquísimo y la atención fue muy amable 😊 Volvería sin dudar')">
                    Reseña positiva
                  </button>
                </div>
              </div>

              <div v-if="resultadoAnalisis?.moderacion" class="moderation-notice" role="status" aria-live="polite"
                :class="{ 'moderation-notice-warning': resultadoAnalisis.moderacion.estado !== 'PERMITIDO' }">
                <strong>{{ resultadoAnalisis.moderacion.estado === 'SIN_SANCION' ? 'Atención: posible contenido ofensivo, sin sanción' : resultadoAnalisis.moderacion.estado.replaceAll('_', ' ') }}</strong>
                <p>{{ resultadoAnalisis.moderacion.mensaje }}</p>
                <p v-if="resultadoAnalisis.moderacion.estado === 'SIN_SANCION'">No se registró una nueva infracción. Clasificar como ofensivo no implica automáticamente una sanción.</p>
                <span>Infracciones acumuladas: {{ resultadoAnalisis.moderacion.infracciones }}</span>
              </div>

              <div v-if="errorAnalisis" class="error-banner">
                {{ errorAnalisis }}
              </div>
            </div>

            <!-- TARJETA: RESULTADO DEL ANÁLISIS (Imagen 3) -->
            <div v-if="resultadoAnalisis" class="content-card result-panel">
              <div
                class="result-top-banner"
                :class="'banner-' + (resultadoAnalisis.categoria || resultadoAnalisis.sentimiento || 'neutro').toLowerCase()"
              >
                <h3
                  class="result-title"
                  :class="'text-' + (resultadoAnalisis.categoria || resultadoAnalisis.sentimiento || 'neutro').toLowerCase()"
                >
                  {{ resultadoAnalisis.categoria ? (CATEGORIAS_INFO[resultadoAnalisis.categoria]?.nombre || resultadoAnalisis.categoria) : resultadoAnalisis.sentimiento }}
                </h3>
                <div
                  class="result-percentage"
                  :class="'text-' + (resultadoAnalisis.categoria || resultadoAnalisis.sentimiento || 'neutro').toLowerCase()"
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
                      :style="{ width: `${(prob * 100)}%` }"
                    ></div>
                  </div>
                  <span class="prob-value">{{ (prob * 100).toFixed(1) }} %</span>
                </div>
              </div>

              <!-- PIE DE TARJETA: MODELO Y LATENCIA -->
              <div class="result-meta-footer">
                <span class="meta-tag">OffendES · {{ latenciaMs }} ms · Margen: {{ (resultadoAnalisis.margen * 100).toFixed(2) }} %</span>
              </div>

              <!-- DECISIÓN DE MODERACIÓN (Si la API devuelve estado) -->
              <div v-if="resultadoAnalisis.moderacion" class="moderation-decision-box">
                <div class="decision-header">
                  <span class="decision-badge" :class="'badge-' + (resultadoAnalisis.moderacion.estado || '').toLowerCase()">
                    {{ resultadoAnalisis.moderacion.estado }}
                  </span>
                </div>
                <p class="decision-desc">
                  {{ resultadoAnalisis.moderacion.mensaje }}
                </p>
                <div v-if="resultadoAnalisis.moderacion.infracciones !== undefined" class="session-status-note">
                  <p v-if="resultadoAnalisis.moderacion.duracion_minutos">Restricción aplicada: {{ resultadoAnalisis.moderacion.duracion_minutos }} minutos.</p>
                  <strong>Infracciones acumuladas:</strong> {{ resultadoAnalisis.moderacion.infracciones }}
                </div>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA: CÓMO SE PROCESÓ EL TEXTO -->
          <div class="right-column">
            <div class="content-card nlp-pipeline-card">
              <h2 class="card-heading">Cómo se procesó el texto</h2>
              <p class="card-subheading">Visualización didáctica local. La clasificación y la moderación provienen del backend; la API no expone los pasos internos del modelo.</p>

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
                    Demostración local: minúsculas, URLs y menciones sustituidas por etiquetas, eliminación de números y puntuación, y sustitución de emojis conocidos.
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
                      <span v-for="(sw, i) in pipelineNLP.stopWordsEliminadas" :key="i" class="token-pill pill-removed">
                        {{ sw }}
                      </span>
                      <span v-if="pipelineNLP.stopWordsEliminadas.length === 0" class="empty-inline-note">Ninguna</span>
                    </div>
                  </div>

                  <div class="stopwords-subgroup">
                    <span class="subgroup-label text-preserved">Se conservan:</span>
                    <div class="tokens-cloud">
                      <span v-for="(tok, i) in pipelineNLP.tokensConservados" :key="i" class="token-pill pill-preserved">
                        {{ tok }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="pipeline-step">
                  <h4 class="step-title">4 · Lematización aproximada (local)</h4>
                  <p class="step-desc">Ejemplo mediante diccionario y reglas de sufijos. No es la salida interna del modelo.</p>
                  <div class="tokens-cloud">
                    <span v-for="(lema, i) in pipelineNLP.lemas" :key="i" class="token-pill">{{ pipelineNLP.tokensConservados[i] }} → {{ lema }}</span>
                    <span v-if="!pipelineNLP.lemas.length" class="empty-inline-note">No hay términos conservados.</span>
                  </div>
                </div>
                <div class="pipeline-step">
                  <h4 class="step-title">5 · N-gramas y vectorización TF-IDF</h4>
                  <p class="step-desc">Ejemplos locales de términos y pares de palabras. La API no devuelve el vector ni los pesos TF-IDF reales.</p>
                  <span class="subgroup-label">Unigramas (hasta 10):</span>
                  <div class="tokens-cloud">
                    <span v-for="termino in pipelineNLP.caracteristicasTFIDF.unigramas" :key="termino" class="token-pill">{{ termino }}</span>
                  </div>
                  <span class="subgroup-label">Bigramas (hasta 6):</span>
                  <div class="tokens-cloud">
                    <span v-for="(termino, i) in pipelineNLP.caracteristicasTFIDF.bigramas" :key="i" class="token-pill">{{ termino }}</span>
                    <span v-if="!pipelineNLP.caracteristicasTFIDF.bigramas.length" class="empty-inline-note">No hay pares de palabras.</span>
                  </div>
                </div>
                <div class="pipeline-step">
                  <h4 class="step-title">6 · Clasificación (backend)</h4>
                  <p v-if="resultadoAnalisis" class="step-desc">Categoría: {{ resultadoAnalisis.categoria }} · Confianza: {{ resultadoAnalisis.probabilidad }} · Margen: {{ (resultadoAnalisis.margen * 100).toFixed(2) }} %.</p>
                  <p v-else class="step-desc">Sin resultado del backend para este análisis.</p>
                </div>
                <div class="pipeline-step">
                  <h4 class="step-title">7 · Moderación (backend)</h4>
                  <template v-if="resultadoAnalisis?.moderacion">
                    <strong>{{ resultadoAnalisis.moderacion.estado }}</strong>
                    <p class="step-desc">{{ resultadoAnalisis.moderacion.mensaje }}</p>
                    <p class="step-desc">Infracciones: {{ resultadoAnalisis.moderacion.infracciones }}.</p>
                  </template>
                  <p v-else class="step-desc">Sin decisión del backend para este análisis.</p>
                </div>
              </div>
            </div>
          </div>

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
            Un .txt con una reseña por línea, o un .csv con una columna llamada «texto». CSV de una sola columna, sin saltos dentro del texto. Máximo 500 reseñas y 1 MB. Cada análisis aplica las reglas de moderación de tu sesión.
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
              Choose File
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

          <div v-if="errorLote" class="error-banner" role="alert">{{ errorLote }}</div>
          <div class="sample-file-prompt">
            Prueba con <a href="javascript:void(0)" class="link-sample" @click="cargarEjemploLoteCsv">ejemplo_lote.csv</a>.
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
                  <div class="batch-bar-fill bar-negativo" :style="{ width: `${statsLoteResumen.pctNeg}%` }"></div>
                </div>
                <span class="batch-bar-count">{{ statsLoteResumen.neg }} ({{ statsLoteResumen.pctNeg }} %)</span>
              </div>

              <!-- Neutro -->
              <div class="batch-bar-row">
                <span class="batch-bar-label">Vulgar (NOE)</span>
                <div class="batch-bar-track">
                  <div class="batch-bar-fill bar-neutro" :style="{ width: `${statsLoteResumen.pctNeu}%` }"></div>
                </div>
                <span class="batch-bar-count">{{ statsLoteResumen.neu }} ({{ statsLoteResumen.pctNeu }} %)</span>
              </div>

              <!-- Positivo -->
              <div class="batch-bar-row">
                <span class="batch-bar-label">No ofensivo (NO)</span>
                <div class="batch-bar-track">
                  <div class="batch-bar-fill bar-positivo" :style="{ width: `${statsLoteResumen.pctPos}%` }"></div>
                </div>
                <span class="batch-bar-count">{{ statsLoteResumen.pos }} ({{ statsLoteResumen.pctPos }} %)</span>
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
                  <th style="width: 70px;">Fila</th>
                  <th>Texto</th>
                  <th style="width: 140px; text-align: center;">Categoría / Moderación</th>
                  <th style="width: 120px; text-align: right;">Probabilidad</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="res in resultadosLote" :key="res.fila">
                  <td class="text-muted">{{ res.fila }}</td>
                  <td class="text-review-cell">{{ res.texto }}</td>
                  <td style="text-align: center;">
                    <span
                      class="sentiment-pill"
                      :class="'pill-' + res.sentimiento.toLowerCase()"
                    >
                      {{ res.sentimiento }} · {{ res.moderacion.estado }}
                    </span>
                  </td>
                  <td style="text-align: right;" class="text-prob font-mono">
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
              <p class="card-subheading">Datos reales de uso registrados por FastAPI · Actualización automática cada 5 segundos.</p>
            </div>
            <button class="btn-primary-analyze" :disabled="cargandoEstadisticas" @click="cargarEstadisticas">
              {{ cargandoEstadisticas ? 'Actualizando...' : 'Actualizar estadísticas' }}
            </button>
          </div>
          <p v-if="errorEstadisticas" class="error-banner" role="alert">{{ errorEstadisticas }}. Comprueba GET /api/estadisticas.</p>
          <template v-if="estadisticasVivo">
            <div class="production-kpis-grid">
              <div class="prod-kpi-box"><div class="prod-kpi-val">{{ totalVivo }}</div><div class="prod-kpi-label">Comentarios analizados</div></div>
              <div class="prod-kpi-box"><div class="prod-kpi-val">{{ estadisticasVivo.comentarios_ofensivos }}</div><div class="prod-kpi-label">Comentarios OFP + OFG</div></div>
              <div class="prod-kpi-box"><div class="prod-kpi-val">{{ estadisticasVivo.infracciones_registradas }}</div><div class="prod-kpi-label">Infracciones registradas*</div></div>
              <div class="prod-kpi-box"><div class="prod-kpi-val">{{ estadisticasVivo.restricciones_aplicadas }}</div><div class="prod-kpi-label">Restricciones aplicadas</div></div>
              <div class="prod-kpi-box"><div class="prod-kpi-val">{{ Number(estadisticasVivo.latencia_promedio_ms || 0).toFixed(2) }} ms</div><div class="prod-kpi-label">Latencia media de análisis</div></div>
            </div>
            <h3 class="card-subheading-bold" style="margin-top:22px">Distribución de clasificaciones registradas</h3>
            <div v-for="cat in categoriasVivo" :key="cat" class="estadisticas-categoria-fila">
              <div class="estadisticas-categoria-titulo">
                <span>{{ cat }} · {{ CATEGORIAS_INFO[cat]?.nombre || cat }}</span>
                <span>{{ conteoCategoriaVivo(cat) }} ({{ porcentajeCategoriaVivo(cat) }} %)</span>
              </div>
              <div class="estadisticas-barra-fondo"><div class="estadisticas-barra" :style="{ width: porcentajeCategoriaVivo(cat) + '%' }"></div></div>
            </div>
            <p class="card-subheading" style="margin-top:16px; margin-bottom:0">Última actualización: {{ actualizadasEstadisticas }}. Contadores en memoria: se reinician cuando FastAPI se reinicia. *El conteo de infracciones depende de los estados definidos en estadisticas_store.py.</p>
          </template>
          <p v-else-if="!cargandoEstadisticas" class="card-subheading">Todavía no se han recibido estadísticas del backend.</p>
        </div>
        <div class="content-card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
            <h2 class="card-heading">Evaluación real de OffendES</h2>
            <button class="btn-primary-analyze" :disabled="cargandoMetricas" @click="cargarMetricas">
              {{ cargandoMetricas ? 'Cargando...' : 'Actualizar desde FastAPI' }}
            </button>
          </div>
          <p v-if="errorMetricas" class="error-banner" role="alert">{{ errorMetricas }}</p>
          <p v-if="!metricasBackend" class="card-subheading">
            {{ cargandoMetricas ? 'Consultando /api/metricas...' : 'Sin resultados. Comprueba el backend y pulsa Actualizar desde FastAPI.' }}
          </p>
          <template v-if="metricasBackend">
          <p class="card-subheading">Fuente: resultados_modelos.json · Conjunto {{ metricasBackend.conjunto }} · {{ metricasBackend.total_comentarios.toLocaleString('es-BO') }} comentarios · Categorías: {{ categoriasEvaluacion.join(', ') }}.</p>
          <p class="metrics-info-note">Evaluación histórica guardada (GET /api/metricas). Los indicadores de uso en vivo se muestran arriba; la exactitud y el F1 requieren etiquetas reales y no cambian con cada nuevo comentario.</p>
          <div class="production-kpis-grid">
            <div class="prod-kpi-box"><div class="prod-kpi-val">{{ porcentajeEvaluacion(modelosEvaluados.regresion_logistica.accuracy) }}</div><div class="prod-kpi-label">Exactitud · Regresión logística</div></div>
            <div class="prod-kpi-box"><div class="prod-kpi-val">{{ porcentajeEvaluacion(modelosEvaluados.regresion_logistica.f1_macro) }}</div><div class="prod-kpi-label">F1 macro · Regresión logística</div></div>
            <div class="prod-kpi-box"><div class="prod-kpi-val">{{ porcentajeEvaluacion(modelosEvaluados.xgboost.accuracy) }}</div><div class="prod-kpi-label">Exactitud · XGBoost</div></div>
            <div class="prod-kpi-box"><div class="prod-kpi-val">{{ porcentajeEvaluacion(modelosEvaluados.xgboost.f1_macro) }}</div><div class="prod-kpi-label">F1 macro · XGBoost</div></div>
          </div>
          </template>
        </div>

        <template v-if="metricasBackend">
        <div class="content-card">
          <h2 class="card-heading">Comparación de modelos evaluados</h2>
          <p class="card-subheading">Resultados observados sobre el mismo conjunto de prueba.</p>
          <div class="table-scroll"><table class="metrics-comparison-table">
            <thead><tr><th>Modelo</th><th>Exactitud</th><th>F1 macro</th><th>Precisión macro</th><th>Recall macro</th><th>F1 NO</th><th>F1 NOE</th><th>F1 OFG</th><th>F1 OFP</th></tr></thead>
            <tbody>
              <tr v-for="m in modelosDisponibles" :key="m.clave">
                <td class="font-bold">{{ m.nombre }}</td>
                <td class="font-mono">{{ porcentajeEvaluacion(modelosEvaluados[m.clave].accuracy) }}</td>
                <td class="font-mono">{{ porcentajeEvaluacion(modelosEvaluados[m.clave].f1_macro) }}</td>
                <td class="font-mono">{{ porcentajeEvaluacion(modelosEvaluados[m.clave].precision_macro) }}</td>
                <td class="font-mono">{{ porcentajeEvaluacion(modelosEvaluados[m.clave].recall_macro) }}</td>
                <td v-for="cat in categoriasEvaluacion" :key="cat" class="font-mono">{{ tresDecimales(modelosEvaluados[m.clave].f1_por_clase[cat]) }}</td>
              </tr>
            </tbody>
          </table></div>
        </div>

        <div class="content-card">
          <h2 class="card-heading">Matriz de confusión y métricas por clase</h2>
          <p class="card-subheading">Filas: etiqueta real · Columnas: etiqueta predicha. Cada matriz utiliza las cuatro categorías de OffendES.</p>
          <div class="model-pills-row">
            <button v-for="m in modelosDisponibles" :key="m.clave" class="model-pill-btn" :class="{ active: modeloConfusionActivo === m.clave }" @click="modeloConfusionActivo = m.clave">{{ m.nombre }}</button>
          </div>
          <div class="table-scroll" style="margin-bottom: 24px;">
            <table class="confusion-matrix-table" style="width: 100%; min-width: 530px;">
              <thead><tr><th class="matrix-axis-header">Real ↓ / Predicho →</th><th v-for="cat in categoriasEvaluacion" :key="cat">{{ cat }}</th><th>Total real</th></tr></thead>
              <tbody><tr v-for="(fila, i) in matrizEvaluacion" :key="categoriasEvaluacion[i]">
                <td class="matrix-class-row-header">{{ categoriasEvaluacion[i] }}</td>
                <td v-for="(valor, j) in fila" :key="j" class="confusion-cell" :class="{ 'diag-green-dark': i === j && valor > 150, 'diag-green-medium': i === j && valor <= 150 && valor > 0, 'offdiag-pink': i !== j && valor > 0, 'offdiag-zero': valor === 0 }">{{ valor }}</td>
                <td class="font-mono">{{ fila.reduce((total, valor) => total + valor, 0) }}</td>
              </tr></tbody>
            </table>
          </div>
          <h3 class="card-subheading-bold">Reporte de clasificación por categoría</h3>
          <div class="table-scroll"><table class="class-metrics-table" style="width: 100%;">
            <thead><tr><th>Categoría</th><th>Precisión</th><th>Recall</th><th>F1</th><th>Soporte</th></tr></thead>
            <tbody><tr v-for="cat in categoriasEvaluacion" :key="cat">
              <td class="font-bold">{{ cat }}</td>
              <td class="font-mono">{{ tresDecimales(reporteEvaluacion[cat].precision) }}</td>
              <td class="font-mono">{{ tresDecimales(reporteEvaluacion[cat].recall) }}</td>
              <td class="font-mono">{{ tresDecimales(reporteEvaluacion[cat]['f1-score']) }}</td>
              <td class="font-mono">{{ reporteEvaluacion[cat].support }}</td>
            </tr></tbody>
          </table></div>
        </div>

        <div class="content-card">
          <h2 class="card-heading">Alcance de los resultados</h2>
          <p class="card-subheading">Este archivo JSON no contiene métricas de validación cruzada, hiperparámetros, análisis del efecto de stop words, n-gramas ni comparaciones con Naive Bayes o una línea base. Estas secciones de demostración se sustituyeron para no presentar números inventados como resultados reales.</p>
          <p class="card-subheading">Para actualizar estas métricas, actualiza resultados/resultados_modelos.json en el servidor y pulsa «Actualizar desde FastAPI».</p>
        </div>
        </template>
      </div>

      <!-- ==================================================================== -->
      <!-- PESTAÑA 4: DATOS (EXPLORADOR DATASET)                                 -->
      <!-- ==================================================================== -->
      <div v-show="pestanaActiva === 'datos'" class="dataset-view">
        <div class="content-card">
          <h2 class="card-heading">Explorador de Datos</h2>
          <p class="card-subheading">Muestras incluidas en el módulo local de datos; verifica su procedencia antes de tratarlas como datos de entrenamiento reales.</p>

          <div class="dataset-toolbar">
            <div class="search-input-wrapper">
              <input
                v-model="busquedaDatos"
                type="text"
                placeholder="Buscar ejemplos en el dataset..."
                class="search-input"
              />
            </div>
          </div>

          <div class="samples-list">
            <div v-for="m in muestrasDatosFiltradas" :key="m.id" class="sample-item">
              <div class="sample-left">
                <span class="sentiment-pill pill-neutro">{{ m.categoria }}</span>
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
              <p class="card-subheading">Registro secuencial de los análisis realizados en esta sesión.</p>
            </div>
            <button v-if="historialAnalisis.length" class="btn-danger-outline" @click="limpiarHistorial">
              Limpiar historial
            </button>
          </div>

          <div v-if="historialAnalisis.length" class="table-scroll">
            <table class="batch-results-table">
              <thead>
                <tr>
                  <th style="width: 100px;">Hora</th>
                  <th>Texto</th>
                  <th style="width: 140px; text-align: center;">Categoría / Moderación</th>
                  <th style="width: 120px; text-align: right;">Probabilidad</th>
                  <th style="width: 100px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in historialAnalisis" :key="h.id">
                  <td class="text-muted font-mono">{{ h.hora }}</td>
                  <td class="text-review-cell">{{ h.comentario }}</td>
                  <td style="text-align: center;">
                    <span class="sentiment-pill" :class="'pill-' + h.categoria.toLowerCase()">
                      {{ h.categoria }} · {{ h.estadoMod }}
                    </span>
                  </td>
                  <td style="text-align: right;" class="font-mono text-prob">{{ h.probabilidad }}</td>
                  <td>
                    <button class="btn-text-action" @click="probarMuestraEnAnalizador(h.comentario)">
                      Reevaluar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty-state-card">
            No hay registros en el historial todavía.
          </div>
        </div>
      </div>

    </main>

    <!-- PIE DE PÁGINA (Fiel a Imagen 1, 2, 3...) -->
    <footer class="app-footer">
      <div class="footer-content">
        Proyecto Integrador · Clasificación y moderación desde FastAPI · <a :href="`${API_URL.replace(/\/api$/, '')}/docs`" target="_blank" class="footer-link">/api/docs</a>
      </div>
    </footer>
  </div>
</template>

<style>
.estadisticas-vivo-encabezado { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
.estadisticas-categoria-fila { margin: 11px 0; }
.estadisticas-categoria-titulo { display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; font-size:13px; margin-bottom:5px; }
.estadisticas-barra-fondo { height:11px; background:#e2e8f0; border-radius:999px; overflow:hidden; }
.estadisticas-barra { height:100%; background:#00796b; border-radius:999px; transition:width .25s ease; }
/* Restricción integrada: visible en todas las pestañas. */
.aviso-restriccion { margin: 0 0 24px; padding: 22px; border: 1px solid #f0b4b4; background: #fff4f4; color: #872525; border-radius: 12px; }
.restriccion-cabecera { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
.restriccion-cabecera strong { font-size: 18px; }
.restriccion-etiqueta { border-radius: 999px; background: #b91c1c; color: white; font-size: 12px; font-weight: 800; padding: 5px 10px; }
.aviso-restriccion p { margin: 10px 0; line-height: 1.5; }
.restriccion-tiempo { font-size: 38px; font-weight: 800; letter-spacing: 1px; text-align: center; font-variant-numeric: tabular-nums; margin: 12px 0; }
.restriccion-barra-fondo { height: 10px; border-radius: 999px; background: #f3cece; overflow: hidden; }
.restriccion-barra { height: 100%; background: #c83b3b; border-radius: 999px; transition: width 1s linear; }
.btn-comprobar { padding: 10px 16px; margin-top: 12px; background: #b91c1c; border: none; border-radius: 8px; color: white; font-weight: 700; }
.btn-comprobar:disabled { opacity: 0.6; cursor: not-allowed; }

.moderation-notice { margin-top: 16px; padding: 16px; border: 1px solid #0f766e; border-radius: 8px; background: #f0fdfa; color: #134e4a; font-size: 14px; line-height: 1.5; }
.moderation-notice p { margin: 8px 0; }
.moderation-notice-warning { border-color: #d97706; background: #fffbeb; color: #78350f; }
/* --- RESET & VARIABLES GLOBALES --- */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --primary: #00796b;
  --primary-hover: #005f56;
  --primary-light: #e0f2f1;
  --text-dark: #1e293b;
  --text-secondary: #64748b;
  --border-light: #e2e8f0;
  --card-bg: #ffffff;
  --bg-page: #f8fafc;
  --font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

body {
  font-family: var(--font-family);
  background-color: var(--bg-page);
  color: var(--text-dark);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  transition: all 0.15s ease-in-out;
}

/* --- ESTRUCTURA GENERAL --- */
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* --- ENCABEZADO SUPERIOR (Exacto a las imágenes) --- */
.top-nav {
  background: #ffffff;
  border-bottom: 1px solid var(--border-light);
}

.nav-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 20px 24px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-group {
  display: flex;
  align-items: center;
}

.brand-title {
  font-size: 26px;
  font-weight: 800;
  color: #00695c;
  letter-spacing: -0.5px;
  line-height: 1.1;
}

.brand-subtitle {
  font-size: 13.5px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* BADGE ESTADO SUPERIOR DERECHO */
.system-status-pill {
  color: #00796b;
  font-size: 13px;
  font-weight: 500;
}

/* --- BARRA DE PESTAÑAS (TABS) --- */
.tabs-bar {
  border-top: 1px solid #f1f5f9;
}

.tabs-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  gap: 28px;
  overflow-x: auto;
}

.tab-btn {
  padding: 12px 4px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 3px solid transparent;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #00796b;
}

.tab-btn.active {
  color: #00796b;
  border-bottom-color: #00796b;
}

/* --- CUERPO PRINCIPAL --- */
.main-body {
  max-width: 1240px;
  width: 100%;
  margin: 24px auto;
  padding: 0 24px;
  flex: 1;
}

/* --- TARJETAS --- */
.content-card {
  background: var(--card-bg);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.card-heading {
  font-size: 19px;
  font-weight: 700;
  color: #0f172a;
}

.card-subheading {
  font-size: 13.5px;
  color: var(--text-secondary);
  margin-top: 4px;
  margin-bottom: 18px;
}

.card-subheading-bold {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 14px;
}

.card-subheading-small {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.card-heading-results {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

/* --- PESTAÑA 1: ANALIZAR (GRID 2 COLUMNAS) --- */
.grid-two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

.left-column, .right-column {
  display: flex;
  flex-direction: column;
}

.input-wrapper {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
}

.input-wrapper:focus-within {
  border-color: #00796b;
  box-shadow: 0 0 0 3px rgba(0, 121, 107, 0.12);
}

.comment-textarea {
  width: 100%;
  border: none;
  padding: 14px 16px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  color: var(--text-dark);
  outline: none;
}

.textarea-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.char-count {
  font-size: 12px;
  color: #94a3b8;
  font-family: var(--font-mono);
}

.btn-primary-analyze, .btn-primary-classify {
  background-color: #00796b;
  color: #ffffff;
  font-weight: 600;
  font-size: 14px;
  padding: 8px 22px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary-analyze:hover:not(:disabled), .btn-primary-classify:hover:not(:disabled) {
  background-color: #005f56;
}

.sample-pills-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.sample-label {
  font-size: 13px;
  color: #64748b;
}

.chips-container {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sample-chip {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 12.5px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 6px;
}

.sample-chip:hover {
  background: #e2e8f0;
}

/* RESULT PANEL ANALIZAR */
.result-panel {
  padding: 0;
  overflow: hidden;
  margin-top: 8px;
}

.result-top-banner {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
}

.banner-positivo, .banner-no { background-color: #ecfdf5; }
.banner-negativo, .banner-ofp, .banner-ofg { background-color: #fef2f2; }
.banner-neutro, .banner-noe { background-color: #fffbeb; }

.result-title {
  font-size: 24px;
  font-weight: 800;
}

.text-positivo, .text-no { color: #16a34a; }
.text-negativo, .text-ofp, .text-ofg { color: #dc2626; }
.text-neutro, .text-noe { color: #d97706; }

.result-percentage {
  font-size: 26px;
  font-weight: 800;
  font-family: var(--font-mono);
}

.probabilities-list {
  padding: 20px 24px;
}

.prob-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.prob-label-group {
  width: 130px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-negativo, .dot-ofp { background-color: #dc2626; }
.dot-neutro, .dot-noe { background-color: #d97706; }
.dot-positivo, .dot-no { background-color: #16a34a; }
.dot-ofg { background-color: #991b1b; }

.prob-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #1e293b;
}

.prob-bar-container {
  flex: 1;
  height: 8px;
  background-color: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.prob-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s;
}

.bar-negativo, .bar-ofp { background-color: #dc2626; }
.bar-neutro, .bar-noe { background-color: #d97706; }
.bar-positivo, .bar-no { background-color: #16a34a; }
.bar-ofg { background-color: #991b1b; }

.moderation-decision-box {
  margin: 18px 24px 20px;
  padding: 14px 16px;
  background-color: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #00796b;
}

.decision-badge {
  font-size: 11.5px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 6px;
  background: #e2e8f0;
  color: #334155;
}

.badge-permitido { background: #dcfce7; color: #15803d; }
.badge-advertencia { background: #fef3c7; color: #b45309; }
.badge-restringido { background: #fee2e2; color: #b91c1c; }

.decision-desc {
  font-size: 13px;
  color: #334155;
  line-height: 1.4;
}

.session-status-note {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
}

.prob-value {
  width: 58px;
  text-align: right;
  font-size: 13px;
  font-family: var(--font-mono);
  color: #475569;
}

.result-meta-footer {
  padding: 10px 24px;
  background-color: #f8fafc;
  border-top: 1px solid #f1f5f9;
  font-size: 12px;
  color: #64748b;
  font-family: var(--font-mono);
}

/* PIPELINE NLP DERECHA */
.nlp-pipeline-card {
  min-height: 480px;
}

.pipeline-empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #94a3b8;
}

.pipeline-steps-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pipeline-step {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 16px;
}

.pipeline-step:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.step-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #00796b;
  margin-bottom: 4px;
}

.step-original {
  color: #0f172a;
}

.step-desc {
  font-size: 12.5px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.raw-text-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13.5px;
  color: #1e293b;
}

.code-step-box {
  background: #f1f5f9;
  border-radius: 6px;
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: 13px;
}

.tokens-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.token-pill {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 12px;
  font-family: var(--font-mono);
  padding: 3px 8px;
  border-radius: 5px;
}

.stopwords-subgroup {
  margin-top: 8px;
}

.subgroup-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}

.pill-removed {
  background: #fee2e2;
  border-color: #fecaca;
  color: #991b1b;
  text-decoration: line-through;
}

.pill-preserved {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #065f46;
}

/* --- PESTAÑA 2: LOTE (Fiel a Imagen 1 y 2) --- */
.file-input-action-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.hidden-file-input {
  display: none;
}

.btn-choose-file {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 7px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.btn-choose-file:hover {
  background: #e2e8f0;
}

.file-name-label {
  font-size: 13.5px;
  color: #334155;
  font-family: var(--font-mono);
}

.sample-file-prompt {
  font-size: 13px;
  color: #64748b;
}

.link-sample {
  color: #00796b;
  text-decoration: none;
  font-weight: 600;
}

.link-sample:hover {
  text-decoration: underline;
}

/* GRID DOS TARJETAS EN LOTE */
.grid-lote-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.batch-bars-summary {
  margin-bottom: 18px;
}

.batch-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.batch-bar-label {
  width: 70px;
  font-size: 13.5px;
  color: #334155;
}

.batch-bar-track {
  flex: 1;
  height: 9px;
  background-color: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.batch-bar-fill {
  height: 100%;
  border-radius: 999px;
}

.batch-bar-count {
  width: 75px;
  text-align: right;
  font-size: 13px;
  color: #475569;
  font-family: var(--font-mono);
}

.btn-download-csv {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 6px;
}

.btn-download-csv:hover {
  background: #e2e8f0;
}

.omitted-list {
  list-style: none;
  font-size: 13.5px;
  color: #334155;
  line-height: 1.8;
}

/* TABLA RESULTADOS LOTE */
.batch-results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.batch-results-table th {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
  color: #475569;
  font-weight: 700;
}

.batch-results-table td {
  padding: 14px;
  border-bottom: 1px solid #f1f5f9;
}

.text-review-cell {
  color: #1e293b;
  max-width: 550px;
  line-height: 1.45;
}

.sentiment-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.pill-positivo {
  background-color: #dcfce7;
  color: #15803d;
}

.pill-negativo {
  background-color: #fee2e2;
  color: #b91c1c;
}

.pill-neutro {
  background-color: #fef3c7;
  color: #b45309;
}

.text-prob {
  font-size: 13px;
  color: #334155;
}

/* --- PESTAÑA 3: MÉTRICAS (Fiel a Imágenes 3, 4 y 5) --- */

/* SECCIÓN 1: EN PRODUCCIÓN */
.production-kpis-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.prod-kpi-box {
  background: #f8fafc;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 16px 18px;
}

.prod-kpi-box.highlight-blue {
  background-color: #eff6ff;
  border-color: #bfdbfe;
}

.prod-kpi-val {
  font-size: 26px;
  font-weight: 800;
  font-family: var(--font-mono);
  color: #0f172a;
}

.text-blue {
  color: #1d4ed8;
}

.prod-kpi-label {
  font-size: 12.5px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.prod-footer-note {
  font-size: 12px;
  color: #64748b;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

/* SECCIÓN 2: COMPARACIÓN DE MODELOS */
.metrics-comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.metrics-comparison-table th {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
  color: #475569;
  font-weight: 700;
}

.metrics-comparison-table td {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
}

.metrics-comparison-table tr.row-winner {
  background-color: #ecfdf5;
}

.config-cell {
  max-width: 320px;
  font-size: 12px;
  color: #475569;
}

/* SECCIÓN 3: MATRIZ Y REPORTE */
.model-pills-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.model-pill-btn {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 999px;
}

.model-pill-btn.active {
  background: #ffffff;
  border-color: #00796b;
  color: #00796b;
  box-shadow: 0 0 0 1px #00796b;
}

.grid-confusion-and-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.confusion-matrix-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
  font-size: 13px;
}

.matrix-axis-header {
  font-size: 12px;
  color: #64748b;
  padding: 10px;
  text-align: left;
}

.confusion-matrix-table th {
  padding: 10px;
  color: #334155;
  font-weight: 700;
}

.matrix-class-row-header {
  text-align: left;
  font-weight: 700;
  color: #334155;
  padding: 10px;
}

.confusion-cell {
  padding: 14px 10px;
  border: 1px solid #e2e8f0;
  font-family: var(--font-mono);
  font-weight: 700;
}

.diag-green-dark {
  background-color: #2e7d32;
  color: #ffffff;
}

.diag-green-medium {
  background-color: #388e3c;
  color: #ffffff;
}

.offdiag-pink {
  background-color: #fce4ec;
  color: #880e4f;
}

.offdiag-zero {
  background-color: #f8fafc;
  color: #94a3b8;
}

.class-metrics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.class-metrics-table th {
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
  color: #475569;
  font-weight: 700;
}

.class-metrics-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f1f5f9;
}

/* SECCIÓN 4: EFECTO DE CADA DECISIÓN */
.decisions-columns-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.decision-col {
  border-right: 1px solid #f1f5f9;
  padding-right: 16px;
}

.decision-col:last-child {
  border-right: none;
  padding-right: 0;
}

.decision-col-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
}

.decision-item-row {
  margin-bottom: 10px;
}

.decision-option-name {
  display: block;
  font-size: 12px;
  color: #334155;
  margin-bottom: 2px;
}

.decision-score-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.decision-f1 {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.badge-best {
  color: #16a34a;
  font-size: 11.5px;
  font-weight: 700;
}

.delta-red {
  color: #dc2626;
  font-size: 11.5px;
  font-weight: 600;
}

/* SECCIÓN 5: TODOS LOS EXPERIMENTOS */
.experiments-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.experiments-table th {
  padding: 10px;
  text-align: left;
  border-bottom: 2px solid #e2e8f0;
  color: #475569;
  font-weight: 700;
}

.experiments-table td {
  padding: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.experiments-table tr.row-winner {
  background-color: #ecfdf5;
}

.text-hyperparams {
  font-size: 11.5px;
  color: #475569;
}

/* --- PESTAÑA: DATOS & HISTORIAL --- */
.dataset-toolbar {
  margin-bottom: 18px;
}

.search-input {
  width: 100%;
  padding: 9px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13.5px;
  outline: none;
}

.samples-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sample-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.sample-left {
  flex: 1;
}

.sample-text {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 6px 0 2px;
}

.sample-reason {
  font-size: 12px;
}

.btn-sm-test {
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  color: #00796b;
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 6px;
  white-space: nowrap;
}

.btn-sm-test:hover {
  background-color: var(--primary-light);
}

.btn-danger-outline {
  border: 1px solid #fca5a5;
  background: #fff;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 6px;
}

.btn-danger-outline:hover {
  background: #fef2f2;
}

.btn-text-action {
  color: #00796b;
  font-size: 12px;
  font-weight: 600;
  text-decoration: underline;
}

.empty-state-card {
  padding: 40px;
  text-align: center;
  color: #94a3b8;
}

.font-mono {
  font-family: var(--font-mono);
}

.font-bold {
  font-weight: 700;
}

.text-muted {
  color: #94a3b8;
}

.error-banner {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: 10px 14px;
  border-radius: 6px;
  margin-top: 14px;
  font-size: 13px;
}

.table-scroll {
  overflow-x: auto;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* --- FOOTER (Fiel a Imagen 1, 2, 3...) --- */
.app-footer {
  margin-top: auto;
  border-top: 1px solid var(--border-light);
  background: #ffffff;
  padding: 18px 24px;
}

.footer-content {
  max-width: 1240px;
  margin: 0 auto;
  text-align: center;
  font-size: 12.5px;
  color: #94a3b8;
}

.footer-link {
  color: #00796b;
  text-decoration: none;
}

.footer-link:hover {
  text-decoration: underline;
}

/* --- RESPONSIVIDAD --- */
@media (max-width: 950px) {
  .grid-two-columns, .grid-lote-summary, .grid-confusion-and-metrics {
    grid-template-columns: 1fr;
  }
  .production-kpis-grid, .decisions-columns-grid {
    grid-template-columns: 1fr 1fr;
  }
  .nav-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

.metrics-info-note { margin: 12px 0 20px; padding: 12px 16px; border: 1px solid #99d5cb; border-radius: 8px; color: #115e59; background: #f0fdfa; font-size: 13px; }
</style>
