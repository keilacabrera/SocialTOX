/**
 * Datos y configuraciones para la pestaña de Métricas y Comparación de Modelos
 * Extraídos exactamente de los experimentos y especificaciones de evaluación.
 */

export const METRICAS_PRODUCCION = {
  modelo: 'Regresión logística',
  configuracion: 'Stemming (Snowball) · Ajustada (conserva negaciones) · Unigramas + bigramas · C=2, class_weight=balanced',
  version: '20261022-185649',
  kpis: {
    f1Cv: '0.875 ± 0.028',
    f1Prueba: '0.880',
    exactitudPrueba: '89.5 %',
    terminosVocabulario: '1948'
  },
  nota: 'Elegido por F1 macro en validación cruzada sobre entrenamiento. El conjunto de prueba solo se usó para reportar estas cifras. Versión 20261022-185649.'
};

export const COMPARACION_MODELOS = [
  {
    modelo: 'Naive Bayes multinomial',
    configuracion: 'Stemming (Snowball) · Ajustada (conserva negaciones) · Unigramas + bigramas · alpha=0.1, fit_prior=false',
    f1Cv: '0.857',
    exactitudPrueba: '88.8 %',
    f1Prueba: '0.874',
    f1Negativo: '0.907',
    f1Neutro: '0.794',
    f1Positivo: '0.920',
    esGanador: false
  },
  {
    modelo: 'Regresión logística',
    configuracion: 'Stemming (Snowball) · Ajustada (conserva negaciones) · Unigramas + bigramas · C=2, class_weight=balanced',
    f1Cv: '0.875',
    exactitudPrueba: '89.5 %',
    f1Prueba: '0.880',
    f1Negativo: '0.891',
    f1Neutro: '0.813',
    f1Positivo: '0.935',
    esGanador: true
  },
  {
    modelo: 'Línea base (clase más frecuente)',
    configuracion: 'Predice siempre «positivo»',
    f1Cv: '0.217',
    exactitudPrueba: '48.3 %',
    f1Prueba: '0.217',
    f1Negativo: '0.000',
    f1Neutro: '0.000',
    f1Positivo: '0.651',
    esGanador: false
  }
];

export const MODELOS_CONFUSION = {
  regresion: {
    nombre: 'Regresión logística',
    matriz: {
      clases: ['Negativo', 'Neutro', 'Positivo'],
      filas: [
        { real: 'Negativo', valores: [160, 13, 9] },
        { real: 'Neutro', valores: [12, 104, 8] },
        { real: 'Positivo', valores: [5, 15, 266] }
      ]
    },
    metricasClase: [
      { clase: 'Negativo', color: 'negativo', precision: '0.904', recall: '0.879', f1: '0.891', soporte: 182 },
      { clase: 'Neutro', color: 'neutro', precision: '0.788', recall: '0.839', f1: '0.813', soporte: 124 },
      { clase: 'Positivo', color: 'positivo', precision: '0.940', recall: '0.930', f1: '0.935', soporte: 286 }
    ]
  },
  naive_bayes: {
    nombre: 'Naive Bayes multinomial',
    matriz: {
      clases: ['Negativo', 'Neutro', 'Positivo'],
      filas: [
        { real: 'Negativo', valores: [165, 10, 7] },
        { real: 'Neutro', valores: [18, 98, 8] },
        { real: 'Positivo', valores: [9, 14, 263] }
      ]
    },
    metricasClase: [
      { clase: 'Negativo', color: 'negativo', precision: '0.859', recall: '0.907', f1: '0.882', soporte: 182 },
      { clase: 'Neutro', color: 'neutro', precision: '0.803', recall: '0.790', f1: '0.794', soporte: 124 },
      { clase: 'Positivo', color: 'positivo', precision: '0.946', recall: '0.920', f1: '0.933', soporte: 286 }
    ]
  },
  linea_base: {
    nombre: 'Línea base (clase más frecuente)',
    matriz: {
      clases: ['Negativo', 'Neutro', 'Positivo'],
      filas: [
        { real: 'Negativo', valores: [0, 0, 182] },
        { real: 'Neutro', valores: [0, 0, 124] },
        { real: 'Positivo', valores: [0, 0, 286] }
      ]
    },
    metricasClase: [
      { clase: 'Negativo', color: 'negativo', precision: '0.000', recall: '0.000', f1: '0.000', soporte: 182 },
      { clase: 'Neutro', color: 'neutro', precision: '0.000', recall: '0.000', f1: '0.000', soporte: 124 },
      { clase: 'Positivo', color: 'positivo', precision: '0.483', recall: '1.000', f1: '0.651', soporte: 286 }
    ]
  }
};

export const EFECTO_DECISIONES = {
  stopWords: [
    { opcion: 'Ajustada (conserva negaciones)', f1: '0.875', esMejor: true, delta: null },
    { opcion: 'Lista completa de spaCy', f1: '0.854', esMejor: false, delta: '-2.10 pts' }
  ],
  ngramas: [
    { opcion: 'Unigramas', f1: '0.864', esMejor: false, delta: '-1.06 pts' },
    { opcion: 'Unigramas + bigramas', f1: '0.875', esMejor: true, delta: null }
  ],
  normalizacion: [
    { opcion: 'Lematización (spaCy)', f1: '0.874', esMejor: false, delta: '-0.04 pts' },
    { opcion: 'Stemming (Snowball)', f1: '0.875', esMejor: true, delta: null }
  ],
  modelo: [
    { opcion: 'Regresión logística', f1: '0.875', esMejor: true, delta: null },
    { opcion: 'Naive Bayes', f1: '0.857', esMejor: false, delta: '-1.73 pts' }
  ]
};

export const TODOS_LOS_EXPERIMENTOS = [
  {
    id: 1,
    modelo: 'Regresión logística',
    normalizacion: 'Stemming (Snowball)',
    stopWords: 'Ajustada (conserva negaciones)',
    ngramas: 'Unigramas + bigramas',
    hiperparametros: '{"C": 2, "class_weight": "balanced"}',
    f1Cv: '0.875 ± 0.028',
    exactitudPrueba: '89.5 %',
    esGanador: true
  },
  {
    id: 2,
    modelo: 'Regresión logística',
    normalizacion: 'Lematización (spaCy)',
    stopWords: 'Ajustada (conserva negaciones)',
    ngramas: 'Unigramas + bigramas',
    hiperparametros: '{"C": 2, "class_weight": "balanced"}',
    f1Cv: '0.874 ± 0.025',
    exactitudPrueba: '89.1 %',
    esGanador: false
  },
  {
    id: 3,
    modelo: 'Regresión logística',
    normalizacion: 'Stemming (Snowball)',
    stopWords: 'Ajustada (conserva negaciones)',
    ngramas: 'Unigramas',
    hiperparametros: '{"C": 2, "class_weight": "balanced"}',
    f1Cv: '0.864 ± 0.027',
    exactitudPrueba: '88.4 %',
    esGanador: false
  },
  {
    id: 4,
    modelo: 'Regresión logística',
    normalizacion: 'Lematización (spaCy)',
    stopWords: 'Ajustada (conserva negaciones)',
    ngramas: 'Unigramas',
    hiperparametros: '{"C": 2, "class_weight": "balanced"}',
    f1Cv: '0.862 ± 0.029',
    exactitudPrueba: '88.0 %',
    esGanador: false
  },
  {
    id: 5,
    modelo: 'Naive Bayes',
    normalizacion: 'Stemming (Snowball)',
    stopWords: 'Ajustada (conserva negaciones)',
    ngramas: 'Unigramas + bigramas',
    hiperparametros: '{"alpha": 0.1, "fit_prior": false}',
    f1Cv: '0.857 ± 0.026',
    exactitudPrueba: '88.8 %',
    esGanador: false
  },
  {
    id: 6,
    modelo: 'Naive Bayes',
    normalizacion: 'Lematización (spaCy)',
    stopWords: 'Ajustada (conserva negaciones)',
    ngramas: 'Unigramas + bigramas',
    hiperparametros: '{"alpha": 0.1, "fit_prior": false}',
    f1Cv: '0.855 ± 0.024',
    exactitudPrueba: '88.2 %',
    esGanador: false
  },
  {
    id: 7,
    modelo: 'Regresión logística',
    normalizacion: 'Stemming (Snowball)',
    stopWords: 'Lista completa de spaCy',
    ngramas: 'Unigramas + bigramas',
    hiperparametros: '{"C": 1.5, "class_weight": "balanced"}',
    f1Cv: '0.854 ± 0.030',
    exactitudPrueba: '87.6 %',
    esGanador: false
  },
  {
    id: 8,
    modelo: 'Regresión logística',
    normalizacion: 'Lematización (spaCy)',
    stopWords: 'Lista completa de spaCy',
    ngramas: 'Unigramas + bigramas',
    hiperparametros: '{"C": 1.5, "class_weight": "balanced"}',
    f1Cv: '0.852 ± 0.028',
    exactitudPrueba: '87.3 %',
    esGanador: false
  },
  {
    id: 9,
    modelo: 'Naive Bayes',
    normalizacion: 'Stemming (Snowball)',
    stopWords: 'Ajustada (conserva negaciones)',
    ngramas: 'Unigramas',
    hiperparametros: '{"alpha": 0.1, "fit_prior": false}',
    f1Cv: '0.849 ± 0.025',
    exactitudPrueba: '87.5 %',
    esGanador: false
  },
  {
    id: 10,
    modelo: 'Naive Bayes',
    normalizacion: 'Lematización (spaCy)',
    stopWords: 'Ajustada (conserva negaciones)',
    ngramas: 'Unigramas',
    hiperparametros: '{"alpha": 0.1, "fit_prior": false}',
    f1Cv: '0.846 ± 0.027',
    exactitudPrueba: '87.0 %',
    esGanador: false
  },
  {
    id: 11,
    modelo: 'Regresión logística',
    normalizacion: 'Stemming (Snowball)',
    stopWords: 'Lista completa de spaCy',
    ngramas: 'Unigramas',
    hiperparametros: '{"C": 1.0, "class_weight": "balanced"}',
    f1Cv: '0.844 ± 0.031',
    exactitudPrueba: '86.7 %',
    esGanador: false
  },
  {
    id: 12,
    modelo: 'Regresión logística',
    normalizacion: 'Lematización (spaCy)',
    stopWords: 'Lista completa de spaCy',
    ngramas: 'Unigramas',
    hiperparametros: '{"C": 1.0, "class_weight": "balanced"}',
    f1Cv: '0.841 ± 0.032',
    exactitudPrueba: '86.4 %',
    esGanador: false
  },
  {
    id: 13,
    modelo: 'Naive Bayes',
    normalizacion: 'Stemming (Snowball)',
    stopWords: 'Lista completa de spaCy',
    ngramas: 'Unigramas + bigramas',
    hiperparametros: '{"alpha": 0.2, "fit_prior": false}',
    f1Cv: '0.838 ± 0.029',
    exactitudPrueba: '86.1 %',
    esGanador: false
  },
  {
    id: 14,
    modelo: 'Naive Bayes',
    normalizacion: 'Lematización (spaCy)',
    stopWords: 'Lista completa de spaCy',
    ngramas: 'Unigramas + bigramas',
    hiperparametros: '{"alpha": 0.2, "fit_prior": false}',
    f1Cv: '0.835 ± 0.030',
    exactitudPrueba: '85.8 %',
    esGanador: false
  },
  {
    id: 15,
    modelo: 'Naive Bayes',
    normalizacion: 'Stemming (Snowball)',
    stopWords: 'Lista completa de spaCy',
    ngramas: 'Unigramas',
    hiperparametros: '{"alpha": 0.5, "fit_prior": false}',
    f1Cv: '0.829 ± 0.033',
    exactitudPrueba: '85.1 %',
    esGanador: false
  },
  {
    id: 16,
    modelo: 'Naive Bayes',
    normalizacion: 'Lematización (spaCy)',
    stopWords: 'Lista completa de spaCy',
    ngramas: 'Unigramas',
    hiperparametros: '{"alpha": 0.5, "fit_prior": false}',
    f1Cv: '0.825 ± 0.034',
    exactitudPrueba: '84.7 %',
    esGanador: false
  }
];

// Datos de demostración precargados para el archivo ejemplo_lote.csv (Pestaña Lote)
export const EJEMPLO_LOTE_DATOS = [
  {
    fila: 1,
    texto: 'El fricasé estaba delicioso y el personal es cordial. 100% recomendado',
    sentimiento: 'Positivo',
    probabilidad: '78.1 %'
  },
  {
    fila: 2,
    texto: 'Pésima atención. Esperamos 75 minutos y nos ignoraron por completo 😡',
    sentimiento: 'Negativo',
    probabilidad: '88.3 %'
  },
  {
    fila: 3,
    texto: 'Cumple con lo básico, el precio es el promedio de la zona',
    sentimiento: 'Neutro',
    probabilidad: '89.8 %'
  },
  {
    fila: 4,
    texto: 'Las empanadas no estaban nada mal y no salimos con hambre',
    sentimiento: 'Negativo',
    probabilidad: '44.8 %'
  },
  {
    fila: 5,
    texto: 'Rico el charque, pero las porciones son ridículamente pequeñas',
    sentimiento: 'Neutro',
    probabilidad: '72.3 %'
  },
  {
    fila: 6,
    texto: 'Qué maravilla de atención... súper atentos a su celular 🙄',
    sentimiento: 'Negativo',
    probabilidad: '60.1 %'
  },
  {
    fila: 7,
    texto: '',
    omitida: true,
    motivo: 'El texto está vacío.'
  },
  {
    fila: 8,
    texto: '    ',
    omitida: true,
    motivo: 'El texto no contiene palabras.'
  },
  {
    fila: 9,
    texto: 'La sazón es excelente, aunque el baño estaba sucio',
    sentimiento: 'Neutro',
    probabilidad: '37.9 %'
  },
  {
    fila: 10,
    texto: 'No vuelvo más. El api estaba aguado y me cobraron de más',
    sentimiento: 'Negativo',
    probabilidad: '90.5 %'
  }
];

