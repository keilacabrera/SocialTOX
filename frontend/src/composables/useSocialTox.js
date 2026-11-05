import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { procesarPipelineNLP } from '../utils/nlpPipeline'
import {
  CATEGORIAS_INFO,
  ACCIONES_INFO,
  EJEMPLOS_PRUEBA,
  MUESTRAS_DATASET,
} from '../utils/datasetOffendES'
import { EJEMPLO_LOTE_DATOS } from '../utils/metricasData'

export function useSocialTox() {
  // --- ESTADO GENERAL Y NAVEGACIÓN ---
  const pestanaActiva = ref('panel') // 'analizar' | 'lote' | 'metricas' | 'datos' | 'historial'
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
  const progresoRestriccion = computed(() =>
    duracionRestriccion.value
      ? Math.min(100, Math.max(0, (segundosRestantes.value / duracionRestriccion.value) * 100))
      : 0,
  )
  let reloj
  const comprobandoVencimiento = ref(false)

  function actualizarRestriccion(data) {
    if (typeof data?.infracciones === 'number') infraccionesSesion.value = data.infracciones
    
    if (typeof data?.advertencias_vulgaridad === 'number') {
      advertenciasVulgaridad.value = data.advertencias_vulgaridad
    }
    
    if (data?.estado !== 'RESTRINGIDO') {
      restriccionActiva.value = null
      duracionRestriccion.value = 0
      verificacionPendiente.value = false
      return
    }

    const fin = Date.parse(data.fecha_fin || '')
    const resto = Number(data.tiempo_restante_segundos ?? (data.duracion_minutos ?? 0) * 60)
    // El backend envía fecha_fin; conservarla para evitar desbloqueo por refresco.
    const fecha_fin = Number.isFinite(fin)
      ? data.fecha_fin
      : new Date(Date.now() + Math.max(0, resto) * 1000).toISOString()
    restriccionActiva.value = {
      ...data,
      fecha_fin,
      mensaje: data.mensaje || 'Tienes una restricción activa.',
    }
    ahora.value = Date.now()
    duracionRestriccion.value = Math.max(duracionRestriccion.value, segundosRestantes.value)
    verificacionPendiente.value = segundosRestantes.value === 0
  }

  // --- PESTAÑA: ANALIZAR ---
  const comentario = ref('')
  const cargando = ref(false)
  const errorAnalisis = ref('')
  const infraccionesSesion = ref(0)
  const advertenciasVulgaridad = ref(0)

  const LIMITE_ADVERTENCIAS_VULGARIDAD = 3

  const advertenciasRestantes = computed(() =>
    Math.max(
      0,
      LIMITE_ADVERTENCIAS_VULGARIDAD - advertenciasVulgaridad.value
    )
  )

  const resultadoAnalisis = ref(null)
  const pipelineNLP = ref(null)
  const latenciaMs = ref(null)

  // --- PESTAÑA: LOTE (Imágenes 1 y 2) ---
  const archivoSeleccionado = ref(null)
  const nombreArchivo = ref('ejemplo_lote.csv')
  const cargandoLote = ref(false)
  const totalFilasLote = ref(0)
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
    xgboost: 'XGBoost',
  }
  const modelosDisponibles = computed(() =>
    Object.keys(metricasBackend.value?.modelos || {}).map((clave) => ({
      clave,
      nombre: nombresModelos[clave] || clave,
    })),
  )
  const categoriasEvaluacion = computed(() => metricasBackend.value?.categorias || [])
  const modelosEvaluados = computed(() => metricasBackend.value?.modelos || {})
  const modeloEvaluadoActual = computed(
    () => modelosEvaluados.value[modeloConfusionActivo.value] || null,
  )
  const porcentajeEvaluacion = (valor) =>
    Number.isFinite(Number(valor)) ? `${(Number(valor) * 100).toFixed(2)} %` : '—'
  const tresDecimales = (valor) => (Number.isFinite(Number(valor)) ? Number(valor).toFixed(3) : '—')
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
  const conteoCategoriaVivo = (cat) => Number(estadisticasVivo.value?.categorias?.[cat] || 0)
  const porcentajeCategoriaVivo = (cat) =>
    totalVivo.value > 0 ? ((conteoCategoriaVivo(cat) / totalVivo.value) * 100).toFixed(1) : '0.0'

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
        signal: AbortSignal.timeout(30000),
      })
    } catch (err) {
      apiConectada.value = false
      throw new Error(
        err.name === 'TimeoutError'
          ? 'El servidor tardó demasiado. Comprueba el estado de sesión antes de reintentar.'
          : 'No se pudo conectar con FastAPI. Comprueba que funcione en http://localhost:8000.',
      )
    }
    apiConectada.value = respuesta.status < 500
    const datos = await respuesta.json().catch(() => null)
    if (respuesta.status === 429) {
      if (datos?.detail && typeof datos.detail === 'object')
        actualizarRestriccion({ ...datos.detail, estado: 'RESTRINGIDO' })
      throw new Error(datos?.detail?.mensaje || 'Tienes una restricción activa.')
    }
    if (!respuesta.ok) {
      throw new Error(
        typeof datos?.detail === 'string'
          ? datos.detail
          : datos?.detail?.mensaje || `El backend respondió con error ${respuesta.status}.`,
      )
    }
    if (!datos) throw new Error('La API no devolvió una respuesta JSON válida.')
    return datos
  }

  async function verificarSesionBackend() {
    if (!promesaSesion) {
      promesaSesion = solicitarAPI('/sesion')
        .then((data) => {
          actualizarRestriccion(data)
          sesionLista.value = true
          return data
        })
        .finally(() => {
          promesaSesion = null
        })
    }
    return promesaSesion
  }

  async function verificarFinRestriccion() {
    if (comprobandoVencimiento.value) return
    comprobandoVencimiento.value = true
    verificacionPendiente.value = true
    try {
      await verificarSesionBackend()
      errorAnalisis.value = ''
    } catch (err) {
      errorAnalisis.value = 'No se pudo comprobar el fin de la restricción. ' + err.message
    } finally {
      comprobandoVencimiento.value = false
    }
  }

  onMounted(async () => {
    reloj = setInterval(() => {
      ahora.value = Date.now()
      if (bloqueado.value && segundosRestantes.value === 0 && !verificacionPendiente.value) {
        void verificarFinRestriccion()
      }
    }, 1000)
    try {
      await verificarSesionBackend()
    } catch (err) {
      errorAnalisis.value = err.message
    }
    void cargarMetricas()
    void cargarEstadisticas()
    intervaloEstadisticas = setInterval(() => {
      void cargarEstadisticas()
    }, 5000)
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comentario: texto }),
    })
    if (!pred.categoria_predicha || !pred.probabilidades || !pred.moderacion) {
      throw new Error('La respuesta no contiene la clasificación y moderación esperadas.')
    }
    const mod = pred.moderacion
    actualizarRestriccion(mod)
    const resultado = {
      texto,
      categoria: pred.categoria_predicha,
      probabilidad: (pred.probabilidades[pred.categoria_predicha] * 100).toFixed(2) + ' %',
      probabilidades: pred.probabilidades,
      margen: pred.margen,
      moderacion: mod,
    }
    historialAnalisis.value.unshift({
      id: crypto.randomUUID(),
      fecha: new Date().toLocaleString('es-BO'),
      detalle: resultado,
      hora: new Date().toLocaleTimeString(),
      comentario: texto,
      categoria: resultado.categoria,
      probabilidad: resultado.probabilidad,
      estadoMod: mod.estado,
    })
    return resultado
  }

  async function analizarTextoActual() {
    if (cargando.value || cargandoLote.value || bloqueado.value) return
    const texto = comentario.value.trim()
    if (!texto) {
      errorAnalisis.value = 'Escribe un comentario antes de analizar.'
      return
    }
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
    } finally {
      cargando.value = false
    }
  }

  function limpiarAnalizador() {
    comentario.value = ''
    resultadoAnalisis.value = null
    pipelineNLP.value = null
    errorAnalisis.value = ''
  }

  // --- FUNCIONALIDAD PESTAÑA: LOTE (Imágenes 1 y 2) ---
  function cargarEjemploLoteCsv() {
    archivoSeleccionado.value = new File(
      [EJEMPLO_LOTE_DATOS.map((r) => r.texto).join('\n')],
      'ejemplo_lote.txt',
      { type: 'text/plain' },
    )
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
      errorLote.value = 'El archivo supera 1 MB.'
      return
    }
    cargandoLote.value = true
    resultadosLote.value = []
    filasOmitidas.value = []
    loteEjecutado.value = true
    try {
      const lineas = (await archivoSeleccionado.value.text()).split(/\r?\n/)
      totalFilasLote.value = lineas.length
      const inicio =
        lineas[0]
          ?.replace(/^\uFEFF/, '')
          .trim()
          .toLowerCase() === 'texto'
          ? 1
          : 0
      if (lineas.length - inicio > 500) throw new Error('El archivo supera las 500 líneas.')
      for (let i = inicio; i < lineas.length; i++) {
        const texto = lineas[i]
          .trim()
          .replace(/^"(.*)"$/, '$1')
          .replace(/""/g, '"')
        if (!texto) {
          filasOmitidas.value.push({ fila: i + 1, motivo: 'Texto vacío.' })
          continue
        }
        if (bloqueado.value)
          throw new Error(
            'Lote detenido por la restricción de la sesión. Las filas restantes no se enviaron.',
          )
        const res = await consultarModelo(texto)
        resultadosLote.value.push({
          fila: i + 1,
          texto,
          sentimiento: res.categoria,
          probabilidad: res.probabilidad,
          moderacion: res.moderacion,
        })
      }
    } catch (error) {
      errorLote.value = error.message
    } finally {
      cargandoLote.value = false
      void cargarEstadisticas()
    }
  }

  // Resumen del Lote clasificado
  const statsLoteResumen = computed(() => {
    const total = resultadosLote.value.length
    if (total === 0) return { total: 0, neg: 0, neu: 0, pos: 0, pctNeg: 0, pctNeu: 0, pctPos: 0 }

    const neg = resultadosLote.value.filter((r) => ['OFP', 'OFG'].includes(r.sentimiento)).length
    const neu = resultadosLote.value.filter((r) => r.sentimiento === 'NOE').length
    const pos = resultadosLote.value.filter((r) => r.sentimiento === 'NO').length

    return {
      total,
      neg,
      neu,
      pos,
      pctNeg: Math.round((neg / total) * 100),
      pctNeu: Math.round((neu / total) * 100),
      pctPos: Math.round((pos / total) * 100),
    }
  })

  function descargarResultadosLoteCsv() {
    if (resultadosLote.value.length === 0) return
    const headers = ['Fila', 'Texto', 'Categoría', 'Probabilidad']
    const filas = resultadosLote.value.map(
      (r) => `"${r.fila}";"${r.texto.replace(/"/g, '""')}";"${r.sentimiento}";"${r.probabilidad}"`,
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
    return MUESTRAS_DATASET.filter((m) => {
      const coincideFiltro = filtroDatos.value === 'TODOS' || m.categoria === filtroDatos.value
      const coincideBusqueda =
        !busquedaDatos.value.trim() ||
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

  const menuAbierto = ref(false)
  const busquedaHistorial = ref('')
  const detalleHistorial = ref(null)
  const dialogoDetalle = ref(null)
  watch(detalleHistorial, async (detalle) => {
    await nextTick()
    if (detalle && !dialogoDetalle.value.open) dialogoDetalle.value.showModal()
    else if (!detalle && dialogoDetalle.value.open) dialogoDetalle.value.close()
  })
  const historialFiltrado = computed(() =>
    historialAnalisis.value.filter(
      (h) =>
        (filtroHistorial.value === 'TODOS' || h.categoria === filtroHistorial.value) &&
        h.comentario.toLowerCase().includes(busquedaHistorial.value.trim().toLowerCase()),
    ),
  )

  function navegar(clave) {
    pestanaActiva.value = clave
    menuAbierto.value = false
  }

  return {
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
    advertenciasVulgaridad,
    advertenciasRestantes,  
  }
}
