# SocialTOX · Frontend

Interfaz Vue 3 y Vite conectada con FastAPI.

## Ejecutar

Desde frontend, ejecutar npm.cmd run dev (o npm run dev).
Si faltan dependencias: npm.cmd install.
API predeterminada: http://localhost:8000/api. Usar localhost en el frontend para compartir las cookies de sesión.
VITE_API_URL permite configurar otra URL base terminada en /api.
Compilación: npm.cmd run build. Previsualización: npm.cmd run preview.
El servidor de producción debe permitir el origen del frontend mediante CORS; el proxy de Vite solo se aplica al desarrollo.

## Funciones

Panel con estadísticas reales cada 5 segundos, análisis individual, análisis por lotes, historial temporal con búsqueda y detalles, moderación, evaluación de modelos y muestras locales.
El historial se borra al recargar. Reevaluar vuelve a enviar el comentario y puede aplicar moderación.
Las estadísticas operativas se reinician con el backend. Las métricas de evaluación proceden de /api/metricas.
Los ejemplos y el procesamiento NLP didáctico son locales; no representan trazas internas del modelo.
Lotes: TXT o CSV de una columna texto, un comentario por línea, hasta 500 líneas y 1 MB, sin saltos dentro del comentario. Una restricción detiene el lote.

## Organización

src/composables/useSocialTox.js: solicitudes, sesión, restricciones y acciones.
src/components/: navegación, panel e indicadores reutilizables.
src/App.vue: coordinación y pantallas de análisis, lotes, historial, moderación, métricas y muestras.
src/styles/base.css: estilos conservados de los componentes existentes.
src/styles/theme.css: identidad visual y adaptación móvil.
No se agregaron dependencias ni se modificó el backend.
