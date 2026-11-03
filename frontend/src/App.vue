
<script setup>
import { ref } from 'vue'

const comentario = ref('')
const resultado = ref(null)
const cargando = ref(false)
const error = ref('')

// Estado de la restricción.
const restriccionActiva = ref(false)
const segundosRestantes = ref(0)
const duracionRestriccion = ref(0)
const mensajeRestriccion = ref('')

// Identificador del temporizador.
let intervaloRestriccion = null

// const API_URL = 'http://127.0.0.1:8000'
const API_URL = 'http://localhost:8000'

const categorias = {
  NO: 'No ofensivo',
  NOE: 'Vulgar u obsceno',
  OFG: 'Ofensivo hacia un grupo',
  OFP: 'Ofensivo hacia una persona',
}

const acciones = {
  PERMITIR: 'Comentario permitido',
  REVISION_PRIORITARIA_OFG: 'Revisión prioritaria de grupo',
  REVISION_HUMANA_OFP: 'Revisión humana',
  REVISION_CONTEXTUAL_NOE: 'Revisión contextual',
  REVISION_POR_INCERTIDUMBRE: 'Revisión por incertidumbre',
}

// Convierte los segundos restantes a formato MM:SS.
const tiempoFormateado = computed(() => {
  const minutos = Math.floor(segundosRestantes.value / 60)
  const segundos = segundosRestantes.value % 60

  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
})

const progresoRestriccion = computed(() => {
  if (!duracionRestriccion.value) return 0

  return Math.min(
    100,
    (segundosRestantes.value / duracionRestriccion.value) * 100
  )
})

// Inicia o reinicia la cuenta regresiva.
function iniciarCuentaRegresiva(segundos) {
  // Evitar temporizadores duplicados.
  if (intervaloRestriccion !== null) {
    clearInterval(intervaloRestriccion)
    intervaloRestriccion = null
  }

  const duracion = Math.max(0, Number(segundos) || 0)

  duracionRestriccion.value = duracion

  restriccionActiva.value = true
  segundosRestantes.value = duracion

  // Utilizar una fecha límite para evitar desviaciones
  // si el navegador retrasa la ejecución del intervalo.
  const fechaFin = Date.now() + duracion * 1000

  intervaloRestriccion = setInterval(() => {
    const restante = Math.ceil(
      (fechaFin - Date.now()) / 1000
    )

    segundosRestantes.value = Math.max(0, restante)

    if (restante <= 0) {
      clearInterval(intervaloRestriccion)
      intervaloRestriccion = null

      console.log('Resultado al finalizar:', resultado.value)

      restriccionActiva.value = false
      mensajeRestriccion.value =
        'El periodo de restricción ha finalizado. Ya puedes volver a intentarlo.'
    }
  }, 1000)
}

async function analizarComentario() {

  if (restriccionActiva.value) {
    return
  }

  if (!comentario.value.trim()) {
    error.value = 'Escribe un comentario antes de analizar.'
    return
  }

  cargando.value = true
  error.value = ''
  // resultado.value = null

  try {
    const respuesta = await fetch(`${API_URL}/analizar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comentario: comentario.value,
      }),
    })

    const datos = await respuesta.json()

    // Manejar una restricción activa.
    if (respuesta.status === 429) {
      const detalle = datos.detail || {}

      mensajeRestriccion.value =
        detalle.mensaje || 'Tienes una restricción activa.'

      iniciarCuentaRegresiva(
        detalle.tiempo_restante_segundos
      )

      return
    }

    if (!respuesta.ok) {
      throw new Error(`Error del servidor: ${respuesta.status}`)
    }

    // resultado.value = await respuesta.json()
    // La respuesta ahora contiene el análisis y la moderación.
    resultado.value = datos

    // Limpiar posibles mensajes de restricciones anteriores.
    mensajeRestriccion.value = ''
    restriccionActiva.value = false
    
  } catch (e) {
    error.value =
      'No se pudo conectar con el backend. Comprueba que FastAPI esté funcionando.'
  } finally {
    cargando.value = false
  }
}

function limpiar() {
  comentario.value = ''
  resultado.value = null
  error.value = ''
}
</script>

<template>
  <div class="pagina">
    <header class="encabezado">
      <div class="marca">
        <div class="logo">S</div>
        <div>
          <h1>Social<span>TOX</span></h1>
          <p>Sistema inteligente de moderación</p>
        </div>
      </div>

      <div class="estado">
        <span class="punto"></span>
        Análisis inteligente
      </div>
    </header>

    <main class="contenido">
      <section class="presentacion">
        <span class="etiqueta">INTELIGENCIA ARTIFICIAL</span>
        <h2>Un espacio digital más seguro.</h2>
        <p>
          Analiza comentarios en español y detecta lenguaje ofensivo
          mediante inteligencia artificial.
        </p>
      </section>

      <section class="panel">
        <div class="panel-titulo">
          <div>
            <h3>Analizar comentario</h3>
            <p>Introduce el texto que deseas evaluar.</p>
          </div>
          <span class="icono">✎</span>
        </div>

        <textarea
          v-model="comentario"
          placeholder="Escribe o pega aquí un comentario..."
          rows="5"
          maxlength="5000"
          :disabled="cargando"
        ></textarea>

        <div class="contador">
          {{ comentario.length }} / 5000 caracteres
        </div>

        <div class="botones">
          <button
            class="btn-analizar"
            @click="analizarComentario"
            :disabled="cargando || !comentario.trim()"
          >
            {{ cargando ? 'Analizando...' : 'Analizar comentario →' }}
          </button>

          <button class="btn-limpiar" @click="limpiar" :disabled="cargando">
            Limpiar
          </button>
        </div>

        <div v-if="error" class="mensaje-error">
          {{ error }}
        </div>
      </section>

      <section v-if="resultado" class="panel resultados">
        <div class="panel-titulo">
          <div>
            <h3>Resultado del análisis</h3>
            <p>Clasificación generada por el modelo OffendES.</p>
          </div>
          <span class="icono">✓</span>
        </div>

        <div class="clasificacion">
          <div>
            <span class="texto-secundario">Categoría detectada</span>
            <h2>{{ resultado.categoria_predicha }}</h2>
            <p>{{ categorias[resultado.categoria_predicha] }}</p>
          </div>

          <div class="codigo-categoria">
            {{ resultado.categoria_predicha }}
          </div>
        </div>

        <h4>Probabilidades por categoría</h4>

        <div
          v-for="(probabilidad, categoria) in resultado.probabilidades"
          :key="categoria"
          class="probabilidad"
        >
          <div class="probabilidad-info">
            <span>{{ categorias[categoria] }}</span>
            <strong>{{ (probabilidad * 100).toFixed(2) }}%</strong>
          </div>

          <div class="barra-fondo">
            <div
              class="barra"
              :style="{ width: `${probabilidad * 100}%` }"
            ></div>
          </div>
        </div>

        <div class="accion">
          <span class="texto-secundario">Acción recomendada</span>
          <strong>{{ acciones[resultado.accion_recomendada] }}</strong>
          <small>{{ resultado.accion_recomendada }}</small>
        </div>

        <p class="nota">
          La acción es una recomendación del sistema; las decisiones de
          moderación deben considerar revisión humana y contexto.
        </p>
      </section>
    </main>

    <footer>
      SocialTOX · Detección y moderación de lenguaje ofensivo
    </footer>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f3f5f9;
  color: #202b3c;
}

button,
textarea {
  font: inherit;
}

.pagina {
  min-height: 100vh;
}

.encabezado {
  height: 82px;
  background: #ffffff;
  border-bottom: 1px solid #e7eaf0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8%;
}

.marca {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 43px;
  height: 43px;
  background: #3156d9;
  color: white;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-size: 23px;
  font-weight: bold;
}

.marca h1 {
  margin: 0;
  font-size: 23px;
}

.marca h1 span {
  color: #3156d9;
}

.marca p {
  margin: 4px 0 0;
  color: #8490a3;
  font-size: 12px;
}

.estado {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #526174;
  font-size: 13px;
}

.punto {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #20b981;
}

.contenido {
  max-width: 820px;
  margin: 55px auto;
  padding: 0 20px;
}

.presentacion {
  margin-bottom: 30px;
}

.etiqueta {
  color: #3156d9;
  font-weight: bold;
  font-size: 11px;
  letter-spacing: 1.5px;
}

.presentacion h2 {
  font-size: 34px;
  margin: 13px 0;
}

.presentacion p {
  color: #778397;
  line-height: 1.6;
}

.panel {
  background: white;
  border: 1px solid #e7eaf0;
  border-radius: 15px;
  padding: 27px;
  margin-bottom: 22px;
  box-shadow: 0 5px 20px rgba(30, 45, 70, 0.04);
}

.panel-titulo {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-titulo h3 {
  margin: 0;
  font-size: 19px;
}

.panel-titulo p {
  color: #8490a3;
  font-size: 13px;
  margin-bottom: 0;
}

.icono {
  width: 37px;
  height: 37px;
  background: #edf1ff;
  color: #3156d9;
  display: grid;
  place-items: center;
  border-radius: 10px;
}

textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid #dce2ec;
  border-radius: 10px;
  padding: 16px;
  outline: none;
  line-height: 1.6;
  color: #263348;
}

textarea:focus {
  border-color: #3156d9;
}

.contador {
  text-align: right;
  color: #98a1af;
  font-size: 11px;
  margin-top: 8px;
}

.botones {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

button {
  border: none;
  cursor: pointer;
  border-radius: 9px;
  padding: 13px 20px;
  font-weight: bold;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-analizar {
  background: #3156d9;
  color: white;
}

.btn-analizar:hover:not(:disabled) {
  background: #2545b9;
}

.btn-limpiar {
  background: #edf0f5;
  color: #526174;
}

.mensaje-error {
  background: #fff0f0;
  color: #c03939;
  padding: 13px;
  border-radius: 8px;
  margin-top: 17px;
  font-size: 13px;
}

.resultados h4 {
  margin-top: 27px;
}

.clasificacion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f1f4ff;
  border-radius: 12px;
  padding: 20px;
}

.clasificacion h2 {
  color: #3156d9;
  margin: 9px 0 4px;
  font-size: 27px;
}

.clasificacion p {
  margin: 0;
  color: #66748b;
  font-size: 13px;
}

.texto-secundario {
  display: block;
  color: #8490a3;
  font-size: 12px;
}

.codigo-categoria {
  background: white;
  color: #3156d9;
  font-weight: bold;
  border-radius: 8px;
  padding: 13px;
}

.probabilidad {
  margin: 17px 0;
}

.probabilidad-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 8px;
}

.probabilidad-info strong {
  color: #3156d9;
}

.barra-fondo {
  background: #edf0f5;
  height: 9px;
  border-radius: 20px;
  overflow: hidden;
}

.barra {
  height: 100%;
  background: #3156d9;
  border-radius: 20px;
  transition: width 0.3s;
}

.accion {
  margin-top: 27px;
  padding: 17px;
  background: #f5f7fa;
  border-radius: 10px;
}

.accion strong {
  display: block;
  margin-top: 9px;
  color: #3156d9;
}

.accion small {
  display: block;
  color: #8490a3;
  margin-top: 5px;
}

.nota {
  font-size: 11px;
  color: #8490a3;
  line-height: 1.6;
  margin-top: 17px;
}

footer {
  text-align: center;
  color: #9aa4b3;
  font-size: 12px;
  padding: 25px;
}

@media (max-width: 600px) {
  .encabezado {
    padding: 0 20px;
  }

  .estado {
    font-size: 11px;
  }

  .presentacion h2 {
    font-size: 27px;
  }

  .panel {
    padding: 20px;
  }

  .botones {
    flex-direction: column;
  }
}
</style>
