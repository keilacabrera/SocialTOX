import joblib
from pathlib import Path

from socialtox_preprocesamiento import preprocesar_texto


RUTA_MODELO = (
    Path(__file__).resolve().parent
    / "models"
    / "socialtox_modelo_lematizacion_umbral035.joblib"
)

paquete = joblib.load(RUTA_MODELO)

caracteristicas = paquete["caracteristicas"]
clasificador = paquete["clasificador"]
umbral_toxico = paquete["umbral_toxico"]
clases = paquete["clases"]


def clasificar_comentario(texto):
    """
    Clasifica un comentario y devuelve su predicción
    y las probabilidades de las tres clases.
    """

    texto_procesado = preprocesar_texto(texto, metodo="lema")

    vector = caracteristicas.transform([texto_procesado])

    probabilidades = clasificador.predict_proba(vector)[0]

    indice_toxico = clases.index("3. Tóxico")
    probabilidad_toxica = float(probabilidades[indice_toxico])

    if probabilidad_toxica >= umbral_toxico:
        prediccion = "3. Tóxico"
    else:
        indices_no_toxicos = [
            i for i, clase in enumerate(clases)
            if clase != "3. Tóxico"
        ]

        indice = max(
            indices_no_toxicos,
            key=lambda i: probabilidades[i]
        )

        prediccion = clases[indice]

    return {
        "comentario": texto,
        "prediccion": prediccion,
        "probabilidad_toxica": probabilidad_toxica,
        "probabilidades": {
            clase: float(probabilidades[i])
            for i, clase in enumerate(clases)
        },
        "umbral_toxico": umbral_toxico
    }
