
from api.moderation_store import moderation_store


# Tiempo de restricción según las infracciones confirmadas.
PENALIZACIONES = {
    1: 0,   # Primera infracción: advertencia.
    2: 1,   # Segunda infracción: 1 minuto.
    3: 5,   # Tercera infracción: 5 minutos.
    4: 15,  # Cuarta infracción: 15 minutos.
    5: 30   # Quinta infracción o más: 30 minutos.
}


# Umbrales provisionales de confianza.
UMBRAL_CONFIANZA = 0.60
UMBRAL_MARGEN = 0.20


def procesar_infraccion(session_id):
    """
    Registra una infracción confirmada y determina
    la consecuencia correspondiente.
    """

    # Comprobar si la sesión tiene una restricción activa.
    restriccion = moderation_store.obtener_restriccion(session_id)

    if restriccion is not None:
        return {
            "infracciones": moderation_store.obtener_infracciones(session_id),
            "estado": "RESTRINGIDO",
            "fecha_fin": restriccion.isoformat(),
            "mensaje": "Tu sesión tiene una restricción activa. No puedes continuar."
        }

    # Registrar la nueva infracción confirmada.
    total = moderation_store.registrar_infraccion(session_id)

    nivel = min(total, 5)
    minutos = PENALIZACIONES[nivel]

    if minutos == 0:
        return {
            "infracciones": total,
            "estado": "ADVERTENCIA",
            "mensaje": "Esta es tu primera infracción. Recibes una advertencia."
        }

    fecha_fin = moderation_store.aplicar_restriccion(
        session_id,
        minutos
    )

    return {
        "infracciones": total,
        "estado": "RESTRINGIDO",
        "duracion_minutos": minutos,
        "fecha_fin": fecha_fin.isoformat(),
        "mensaje": f"Has sido restringido durante {minutos} minutos."
    }


def evaluar_moderacion(session_id, resultado_modelo):
    """
    Evalúa la predicción del modelo y determina
    si corresponde permitir, advertir o sancionar.
    """

    categoria = resultado_modelo["categoria_predicha"]
    probabilidades = resultado_modelo["probabilidades"]
    margen = resultado_modelo["margen"]

    confianza = probabilidades[categoria]

    # Comprobar si existe una infracción con suficiente confianza.
    if categoria in ("OFP", "OFG"):

        if (confianza >= UMBRAL_CONFIANZA
                and margen >= UMBRAL_MARGEN):

            sancion = procesar_infraccion(session_id)

            return {
                **sancion,
                "categoria_predicha": categoria,
                "confianza": confianza,
                "margen": margen
            }

        return {
            "estado": "SIN_SANCION",
            "infracciones": moderation_store.obtener_infracciones(session_id),
            "categoria_predicha": categoria,
            "confianza": confianza,
            "margen": margen,
            "mensaje": (
                "El comentario presenta indicios de contenido ofensivo, "
                "pero no alcanza los criterios de confianza para aplicar una sanción."
            )
        }

    # Lenguaje obsceno no necesariamente ofensivo.
    if categoria == "NOE":
        return {
            "estado": "ADVERTENCIA_CONTEXTUAL",
            "infracciones": moderation_store.obtener_infracciones(session_id),
            "categoria_predicha": categoria,
            "confianza": confianza,
            "margen": margen,
            "mensaje": (
                "El comentario contiene lenguaje vulgar u obsceno. "
                "Se recomienda utilizar un lenguaje respetuoso."
            )
        }

    # Comentario no ofensivo.
    return {
        "estado": "PERMITIDO",
        "infracciones": moderation_store.obtener_infracciones(session_id),
        "categoria_predicha": categoria,
        "confianza": confianza,
        "margen": margen,
        "mensaje": "El comentario ha sido permitido."
    }
