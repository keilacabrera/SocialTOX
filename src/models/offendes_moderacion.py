
import cloudpickle
import numpy as np
from pathlib import Path


# Cargar el modelo principal de SocialTOX
# Cargar el modelo principal de SocialTOX


# Obtener la carpeta principal del proyecto
# Obtener la carpeta principal del proyecto (SocialTOX)
BASE_DIR = Path(__file__).resolve().parent.parent  # Agregamos .parent para salir de 'src' y 'models'

# Ruta del modelo
RUTA_MODELO = BASE_DIR / "models" / "socialtox_regresion_logistica.pkl"

# Cargar el modelo
with open(RUTA_MODELO, "rb") as archivo:
    modelo = cloudpickle.load(archivo)

# def analizar_comentario(comentario):
#     """
#     Analiza un comentario utilizando el pipeline de
#     Regresión Logística entrenado para SocialTOX.

#     Categorías:
#         NO: comentario no ofensivo.
#         NOE: lenguaje vulgar u obsceno no ofensivo.
#         OFG: ofensivo dirigido a un grupo.
#         OFP: ofensivo dirigido a una persona.
#     """

def analizar_comentario(comentario):
    """
    # Clasifica un comentario y recomienda una acción de moderación.

    # Categorías:
    #     NO: comentario no ofensivo.
    #     NOE: lenguaje vulgar u obsceno no ofensivo.
    #     OFG: ofensivo dirigido a un grupo.
    #     OFP: ofensivo dirigido a una persona.

    Clasifica un comentario utilizando el modelo OffendES.

    Devuelve:
        - Categoría con mayor probabilidad.
        - Probabilidad de OFG.
        - Probabilidades de todas las categorías.
        - Margen entre las dos probabilidades mayores.
    """

    comentario = str(comentario).strip()

    if not comentario:
        raise ValueError("El comentario no puede estar vacío.")

    # Obtener la categoría predicha
    categoria = modelo.predict([comentario])[0]

    # Obtener las probabilidades de cada categoría
    probabilidades = modelo.predict_proba([comentario])[0]
    clases = modelo.classes_

    # Convertir las probabilidades a un diccionario
    # probabilidades_dict = {
    #     clase: round(float(probabilidades[i]), 4)
    #     for i, clase in enumerate(clases)
    # }

    # Convertir probabilidades a diccionario
    probabilidades_dict = {
        str(clase): round(float(probabilidades[i]), 4)
        for i, clase in enumerate(clases)
    }

    # Obtener probabilidad de OFG
    probabilidad_ofg = probabilidades_dict.get("OFG", 0.0)

    # Calcular margen entre las dos probabilidades mayores
    probabilidades_ordenadas = np.sort(probabilidades)[::-1]

    margen = (
        float(probabilidades_ordenadas[0] - probabilidades_ordenadas[1])
        if len(probabilidades_ordenadas) >= 2
        else 1.0
    )

    # Determinar la acción recomendada
    acciones = {
        "NO": "PERMITIR",
        "NOE": "ADVERTENCIA",
        "OFG": "REVISION_PRIORITARIA",
        "OFP": "REVISION_HUMANA"
    }

    accion = acciones.get(
        str(categoria),
        "REVISION_HUMANA"
    )

    # return {
    #     "comentario": comentario,
    #     "categoria_predicha": str(categoria),
    #     "probabilidad_OFG": probabilidades_dict.get("OFG", 0.0),
    #     "probabilidades": probabilidades_dict,
    #     "margen": round(margen, 4),
    #     "accion_recomendada": acciones.get(
    #         categoria,
    #         "REVISION_HUMANA"
    #     )
    # }

    # Devolver resultados
    return {
        "comentario": comentario,
        "categoria_predicha": str(categoria),
        "probabilidad_OFG": probabilidad_ofg,
        "probabilidades": probabilidades_dict,
        "margen": round(margen, 4),
        "accion_recomendada": accion
    }
