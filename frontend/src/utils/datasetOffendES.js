/**
 * Metadatos y muestras del dataset OffendES y métricas del modelo de Regresión Logística.
 */

export const CATEGORIAS_INFO = {
  NO: {
    codigo: 'NO',
    nombre: 'No ofensivo',
    descripcion: 'Comentario constructivo, neutro o de opinión legítima sin lenguaje hostil.',
    color: '#059669', // Emerald
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    dotColor: '#10b981'
  },
  NOE: {
    codigo: 'NOE',
    nombre: 'Vulgar u obsceno',
    descripcion: 'Uso de groserías, vulgaridades o jerga coloquial fuerte, pero sin intención de atacar.',
    color: '#d97706', // Amber
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    dotColor: '#f59e0b'
  },
  OFP: {
    codigo: 'OFP',
    nombre: 'Ofensivo hacia persona',
    descripcion: 'Insultos directos, humillación, acoso o difamación dirigida a un individuo específico.',
    color: '#e11d48', // Rose/Red
    bgColor: '#fff1f2',
    borderColor: '#fecdd3',
    dotColor: '#f43f5e'
  },
  OFG: {
    codigo: 'OFG',
    nombre: 'Ofensivo hacia grupo',
    descripcion: 'Discurso de odio, discriminación, racismo, xenofobia o intolerancia dirigida a colectivos.',
    color: '#991b1b', // Dark Red / Crimson
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    dotColor: '#b91c1c'
  }
};

export const ACCIONES_INFO = {
  PERMITIR: {
    titulo: 'Comentario permitido',
    nivel: 'success',
    descripcion: 'No se detecta contenido perjudicial. Publicación aprobada.',
    badgeBg: '#ecfdf5',
    badgeColor: '#047857'
  },
  REVISION_CONTEXTUAL_NOE: {
    titulo: 'Revisión contextual (NOE)',
    nivel: 'warning',
    descripcion: 'Contiene lenguaje vulgar sin destinatario ofensivo. Se sugiere cortesía.',
    badgeBg: '#fffbeb',
    badgeColor: '#b45309'
  },
  REVISION_HUMANA_OFP: {
    titulo: 'Revisión humana requerida (OFP)',
    nivel: 'danger',
    descripcion: 'Detectado posible ataque personal directo. Requiere validación del equipo.',
    badgeBg: '#fff1f2',
    badgeColor: '#be123c'
  },
  REVISION_PRIORITARIA_OFG: {
    titulo: 'Revisión prioritaria (OFG)',
    nivel: 'critical',
    descripcion: 'Detectado indicio de odio hacia grupo o colectivo. Intervención urgente.',
    badgeBg: '#fef2f2',
    badgeColor: '#991b1b'
  },
  REVISION_POR_INCERTIDUMBRE: {
    titulo: 'Revisión por incertidumbre',
    nivel: 'info',
    descripcion: 'Margen de predicción estrecho. Se envía a confirmación manual.',
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8'
  }
};

export const EJEMPLOS_PRUEBA = [
  {
    etiqueta: 'No ofensivo',
    categoria: 'NO',
    texto: 'El majadito estaba riquísimo y la atención fue muy amable 😊 Volvería sin dudar.'
  },
  {
    etiqueta: 'Vulgar (NOE)',
    categoria: 'NOE',
    texto: 'No mames qué calor de mierda hace hoy, me estoy derritiendo en la calle.'
  },
  {
    etiqueta: 'Ataque personal (OFP)',
    categoria: 'OFP',
    texto: 'Eres un completo estúpido e inútil, no sirves para nada lárgate de aquí.'
  },
  {
    etiqueta: 'Odio grupal (OFG)',
    categoria: 'OFG',
    texto: 'Toda esa gente extranjera es una peste y deberían expulsarlos del país a todos.'
  },
  {
    etiqueta: 'Ironía / Dudoso',
    categoria: 'NO',
    texto: 'Claro, como eres tan brillante seguro vas a solucionar todos los problemas del mundo...'
  }
];

export const MUESTRAS_DATASET = [
  {
    id: 1,
    texto: 'Muchas felicidades al equipo por este gran logro en el torneo internacional.',
    categoria: 'NO',
    explicacion: 'Mensaje de felicitación y apoyo sin ninguna carga negativa.'
  },
  {
    id: 2,
    texto: 'El silpancho estaba frío y tardaron muchísimo en atendernos, una pena.',
    categoria: 'NO',
    explicacion: 'Crítica negativa sobre un servicio, pero sin insultos ni lenguaje ofensivo.'
  },
  {
    id: 3,
    texto: 'No entendí muy bien la explicación de la clase, ¿alguien tiene los apuntes?',
    categoria: 'NO',
    explicacion: 'Pregunta académica colaborativa.'
  },
  {
    id: 4,
    texto: 'Qué partidazo de la selección boliviana hoy en La Paz, viva el fútbol.',
    categoria: 'NO',
    explicacion: 'Expresión deportiva positiva.'
  },
  {
    id: 5,
    texto: 'No mames qué golazo se acaba de mandar, qué locura de jugada.',
    categoria: 'NOE',
    explicacion: 'Uso de modismo vulgar ("no mames") para expresar asombro positivo.'
  },
  {
    id: 6,
    texto: 'La puta madre, se me cayó el café encima del teclado nuevo.',
    categoria: 'NOE',
    explicacion: 'Maldición por frustración personal sin ofender a un tercero.'
  },
  {
    id: 7,
    texto: 'Vaya coñazo de examen, pero al menos ya salimos de vacaciones.',
    categoria: 'NOE',
    explicacion: 'Jerga informal coloquial para describir una dificultad.'
  },
  {
    id: 8,
    texto: 'Qué mierda de tráfico en la autopista, llevamos 40 minutos parados.',
    categoria: 'NOE',
    explicacion: 'Expresión de enojo por la congestión vial, sin ataque dirigido.'
  },
  {
    id: 9,
    texto: 'Eres una persona nefasta, ignorante y completamente ridícula.',
    categoria: 'OFP',
    explicacion: 'Insultos directos destinados a menoscabar y humillar a un individuo.'
  },
  {
    id: 10,
    texto: 'Cállate la boca payaso, das vergüenza ajena con tus comentarios.',
    categoria: 'OFP',
    explicacion: 'Ataque personal agresivo para silenciar y denigrar a otro usuario.'
  },
  {
    id: 11,
    texto: 'Ojalá te despidan de tu trabajo por incompetente y mentiroso.',
    categoria: 'OFP',
    explicacion: 'Acoso y deseo de daño directo hacia una persona.'
  },
  {
    id: 12,
    texto: 'Eres una estúpida que no tiene la menor idea de cómo funciona la vida.',
    categoria: 'OFP',
    explicacion: 'Descalificación peyorativa dirigida a una mujer.'
  },
  {
    id: 13,
    texto: 'Todos los inmigrantes vienen a robar y destruir la cultura nacional.',
    categoria: 'OFG',
    explicacion: 'Estereotipo xenófobo y difamación generalizada contra un grupo poblacional.'
  },
  {
    id: 14,
    texto: 'Esa religión debería estar prohibida, son todos unos fanáticos violentos.',
    categoria: 'OFG',
    explicacion: 'Discurso de intolerancia y odio hacia una colectividad religiosa.'
  },
  {
    id: 15,
    texto: 'Las mujeres no deberían opinar de fútbol ni de política, no saben nada.',
    categoria: 'OFG',
    explicacion: 'Comentario misógino y discriminatorio por motivo de género.'
  },
  {
    id: 16,
    texto: 'Esa comunidad de indígenas solo sabe bloquear caminos y perjudicar.',
    categoria: 'OFG',
    explicacion: 'Discriminación racial y estigmatización hacia pueblos originarios.'
  }
];

export const METRICAS_MODELO = {
  nombreModelo: 'Regresión Logística multinomial',
  dataset: 'OffendES (Corpus en Español)',
  vectorizador: 'TF-IDF (1-gramas y 2-gramas, sublinear tf)',
  totalMuestrasTest: 5650,
  exactitudGlobal: 0.846,
  f1Macro: 0.812,
  precisionPonderada: 0.851,
  recallPonderado: 0.846,
  latenciaPromedioMs: 9.3,
  clases: [
    {
      codigo: 'NO',
      nombre: 'No ofensivo',
      precision: 0.892,
      recall: 0.915,
      f1: 0.903,
      soporte: 3240
    },
    {
      codigo: 'NOE',
      nombre: 'Vulgar u obsceno',
      precision: 0.768,
      recall: 0.724,
      f1: 0.745,
      soporte: 820
    },
    {
      codigo: 'OFP',
      nombre: 'Ofensivo persona',
      precision: 0.814,
      recall: 0.782,
      f1: 0.798,
      soporte: 1150
    },
    {
      codigo: 'OFG',
      nombre: 'Ofensivo grupo',
      precision: 0.785,
      recall: 0.841,
      f1: 0.812,
      soporte: 440
    }
  ],
  matrizConfusion: {
    clases: ['NO', 'NOE', 'OFP', 'OFG'],
    valores: [
      [2965, 112, 128, 35],
      [145, 594, 61, 20],
      [162, 53, 899, 36],
      [38, 14, 18, 370]
    ]
  }
};

