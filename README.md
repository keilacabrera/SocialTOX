# SocialTOX 
SocialTOX

Sistema de detección y clasificación de comentarios ofensivos mediante técnicas de Procesamiento de Lenguaje Natural (PLN) y modelos de Machine Learning.

Descripción del proyecto

SocialTOX es un sistema diseñado para analizar comentarios de texto e identificar distintos niveles de lenguaje ofensivo. Su objetivo es apoyar la moderación de contenido en plataformas digitales mediante la clasificación automática de comentarios.

El sistema utiliza técnicas de procesamiento de texto y modelos de aprendizaje automático para identificar cuatro categorías:

NO: Comentario no ofensivo.

NOE: Lenguaje vulgar u obsceno no ofensivo.

OFG: Lenguaje ofensivo dirigido a un grupo.

OFP: Lenguaje ofensivo dirigido a una persona.

A partir de la categoría predicha, el sistema puede recomendar una acción de moderación.

Objetivos

Analizar comentarios escritos en lenguaje natural.

Aplicar técnicas de Procesamiento de Lenguaje Natural.

Entrenar y comparar modelos de clasificación.

Identificar el nivel y tipo de contenido ofensivo.

Proporcionar recomendaciones para apoyar la moderación de comentarios.

Tecnologías utilizadas

Python: Desarrollo del sistema.

Pandas y NumPy: Manipulación y procesamiento de datos.

Scikit-learn: Construcción de pipelines y entrenamiento de modelos.

TF-IDF: Representación numérica de los comentarios.

XGBoost: Entrenamiento de un modelo de clasificación.

FastAPI: Desarrollo de la API.

Uvicorn: Servidor para ejecutar la API.

Vue.js: Desarrollo de la interfaz web.

Modelos de Machine Learning

Se entrenaron y compararon dos modelos:

Modelo

Accuracy

F1 Macro

Regresión Logística

83.93%

64.57%

XGBoost

83.08%

54.81%

La Regresión Logística obtuvo el mejor resultado en F1 Macro, por lo que se seleccionó como modelo principal para la integración del sistema. XGBoost se mantiene como modelo de comparación.

Arquitectura del proyecto

El sistema está organizado en los siguientes componentes:

Data: Almacenamiento de los datos utilizados.

Notebooks: Exploración de datos, experimentos y entrenamiento.

Models: Modelos entrenados y guardados.

Resultados: Métricas y resultados de evaluación.

API: Servicio backend para recibir comentarios y devolver predicciones.

Frontend: Interfaz de usuario para interactuar con el sistema.

Src: Código fuente y funciones auxiliares.

Estructura del proyecto

SocialTOX/
│
├── api/
├── data/
│   ├── raw/
│   └── processed/
│
├── frontend/
├── models/
├── notebooks/
├── resultados/
├── src/
│
├── requirements.txt
├── README.md
└── CONTRIBUCIONES.md

Funcionamiento general

El usuario introduce un comentario.

El sistema recibe el texto mediante la interfaz.

La API envía el comentario al pipeline de procesamiento.

El modelo de Regresión Logística realiza la predicción.

El sistema devuelve la categoría, las probabilidades y la acción de moderación recomendada.

Instalación

Clonar o descargar el repositorio y acceder a la carpeta del proyecto.

Crear un entorno virtual:

python -m venv venv

Activar el entorno virtual en Windows:

venv\Scripts\activate

Instalar las dependencias:

pip install -r requirements.txt

Estado del proyecto

Proyecto académico en desarrollo. Se encuentra implementada la exploración de datos, el entrenamiento y evaluación de dos modelos, la exportación de modelos y el desarrollo de la API e interfaz de usuario.

Autores

Proyecto académico SocialTOX.