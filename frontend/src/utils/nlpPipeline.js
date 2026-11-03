/**
 * Pipeline de procesamiento de lenguaje natural en español
 * Réplica de los pasos del pipeline de preprocesamiento y entrenamiento.
 */

// Lista de stopwords en español (protegiendo negaciones esenciales)
const STOPWORDS_ES = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
  'con', 'una', 'su', 'al', 'lo', 'como', 'más', 'mas', 'pero', 'sus', 'le', 'ya', 'o',
  'este', 'sí', 'si', 'porque', 'esta', 'son', 'entre', 'está', 'esta', 'cuando', 'muy',
  'hasta', 'desde', 'está', 'mi', 'porque', 'cada', 'sobre', 'todos', 'todo', 'también',
  'tambien', 'me', 'nos', 'te', 'les', 'nosotros', 'vosotros', 'ellos', 'ellas', 'es',
  'era', 'fue', 'fui', 'fuiste', 'ha', 'han', 'hay', 'había', 'habia', 'sea', 'he',
  'estaba', 'estaban', 'estuvimos', 'estuvo', 'estuvieron', 'tiene', 'tienen', 'tenía',
  'tenia', 'esto', 'estos', 'estas', 'aquellos', 'aquellas', 'aquel'
]);

// Negaciones protegidas (no se eliminan)
const NEGACIONES = new Set(['no', 'nunca', 'jamás', 'jamas', 'sin', 'tampoco']);

// Diccionario de emojis comunes
const EMOJI_MAP = {
  '😊': 'emojipositivo',
  '😀': 'emojipositivo',
  '😃': 'emojipositivo',
  '😄': 'emojipositivo',
  '🥰': 'emojipositivo',
  '😍': 'emojipositivo',
  '❤️': 'emojipositivo',
  '👍': 'emojipositivo',
  '👏': 'emojipositivo',
  '🎉': 'emojipositivo',
  '🔥': 'emojipositivo',
  '😡': 'emojinegativo',
  '🤬': 'emojinegativo',
  '😠': 'emojinegativo',
  '👿': 'emojinegativo',
  '👎': 'emojinegativo',
  '🤮': 'emojinegativo',
  '🤢': 'emojinegativo',
  '💩': 'emojinegativo',
  '🖕': 'emojinegativo',
  '🙄': 'emojineutro',
  '🤔': 'emojineutro',
  '😐': 'emojineutro',
  '🤨': 'emojineutro',
  '😴': 'emojineutro'
};

// Diccionario de lemas y reducciones comunes en español
const LEMAS_COMUNES = {
  'riquísimo': 'rico',
  'riquísima': 'rico',
  'riquísimos': 'rico',
  'buenísimo': 'bueno',
  'buenísima': 'bueno',
  'malísimo': 'malo',
  'pésimo': 'pésimo',
  'volvería': 'volver',
  'volverías': 'volver',
  'volvimos': 'volver',
  'volverán': 'volver',
  'atención': 'atención',
  'comentarios': 'comentario',
  'comentarios': 'comentario',
  'estúpida': 'estúpido',
  'estúpidos': 'estúpido',
  'estúpidas': 'estúpido',
  'imbéciles': 'imbécil',
  'inútiles': 'inútil',
  'incompetentes': 'incompetente',
  'inmigrantes': 'inmigrante',
  'personas': 'persona',
  'mujeres': 'mujer',
  'hombres': 'hombre',
  'comunidades': 'comunidad',
  'soluciones': 'solución',
  'problemas': 'problema'
};

/**
 * Normaliza y descompone el texto en cada fase del pipeline de NLP.
 * @param {string} textoOriginal
 * @returns {Object} Fases detalladas del procesamiento
 */
export function procesarPipelineNLP(textoOriginal) {
  if (!textoOriginal || typeof textoOriginal !== 'string') {
    return null;
  }

  // 1. Reemplazo de emojis
  let textoEmojis = textoOriginal;
  for (const [emoji, etiqueta] of Object.entries(EMOJI_MAP)) {
    textoEmojis = textoEmojis.split(emoji).join(` ${etiqueta} `);
  }

  // 2. Normalización básica
  // Reemplazar URLs
  let normalizado = textoEmojis.replace(/https?:\/\/\S+|www\.\S+/gi, ' url ');
  // Reemplazar menciones
  normalizado = normalizado.replace(/@\w+/g, ' usuario ');
  // Minúsculas
  normalizado = normalizado.toLowerCase();
  // Eliminar puntuación y caracteres especiales (conservar letras acentuadas y eñes)
  normalizado = normalizado.replace(/[^a-záéíóúüñ\s]/gi, ' ');
  // Normalizar espacios en blanco
  normalizado = normalizado.replace(/\s+/g, ' ').trim();

  // 3. Tokenización
  const tokens = normalizado ? normalizado.split(' ').filter(t => t.length > 0) : [];

  // 4. Filtrado de Stop Words
  const stopWordsEliminadas = [];
  const tokensConservados = [];

  for (const token of tokens) {
    if (STOPWORDS_ES.has(token) && !NEGACIONES.has(token)) {
      if (!stopWordsEliminadas.includes(token)) {
        stopWordsEliminadas.push(token);
      }
    } else {
      tokensConservados.push(token);
    }
  }

  // 5. Lematización / Stemming aproximado
  const lemas = tokensConservados.map(token => {
    if (LEMAS_COMUNES[token]) {
      return LEMAS_COMUNES[token];
    }
    // Sufijos comunes de diminutivos / aumentativos / superlativos
    if (token.endsWith('ísimos') || token.endsWith('ísimas')) return token.slice(0, -6) + 'o';
    if (token.endsWith('ísimo') || token.endsWith('ísima')) return token.slice(0, -5) + 'o';
    if (token.endsWith('mente')) return token.slice(0, -5);
    if (token.endsWith('ando') || token.endsWith('iendo')) return token.slice(0, -4) + 'ar';
    if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
    if (token.length > 4 && token.endsWith('s') && !token.endsWith('is') && !token.endsWith('as')) {
      return token.slice(0, -1);
    }
    return token;
  });

  // 6. N-gramas y características TF-IDF
  const unigramas = [...new Set(lemas)];
  const bigramas = [];
  for (let i = 0; i < lemas.length - 1; i++) {
    bigramas.push(`${lemas[i]}_${lemas[i + 1]}`);
  }

  return {
    textoOriginal,
    normalizacion: normalizado,
    tokens,
    totalTokens: tokens.length,
    stopWordsEliminadas,
    tokensConservados,
    lemas,
    caracteristicasTFIDF: {
      unigramas: unigramas.slice(0, 10),
      bigramas: bigramas.slice(0, 6),
      totalCaracteristicas: unigramas.length + bigramas.length
    }
  };
}

