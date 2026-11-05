
from api.moderation_store import moderation_store

# ==========================================
# CONFIGURACIÓN DE PENALIZACIONES
# ==========================================

# Tiempo de restricción según las infracciones confirmadas.
PENALIZACIONES = {
    1: 0,   # Primera infracción: advertencia.
    2: 1,   # Segunda infracción: 1 minuto.
    3: 5,   # Tercera infracción: 5 minutos.
    4: 15,  # Cuarta infracción: 15 minutos.
    5: 30   # Quinta infracción o más: 30 minutos.
}


# Umbrales provisionales de confianza.
# UMBRAL_CONFIANZA = 0.80
# UMBRAL_MARGEN = 0.20

# Cantidad de advertencias vulgares necesarias
# para generar una infracción.
LIMITE_ADVERTENCIAS_VULGARIDAD = 3

# ==========================================
# PROCESAR INFRACCIÓN
# ==========================================

def procesar_infraccion(session_id):
    """
    Registra una infracción confirmada y determina
    la consecuencia correspondiente.
    """

    # Comprobar si la sesión tiene una restricción activa.
    restriccion = moderation_store.obtener_restriccion(session_id)

    if restriccion is not None:
        return {
            "infracciones": moderation_store.obtener_infracciones(
                session_id
            ),
            "estado": "RESTRINGIDO",
            "fecha_fin": restriccion.isoformat(),
            "mensaje": (
                "Tu sesión tiene una restricción activa. "
                "No puedes continuar."
            )
        }

    # Registrar la nueva infracción confirmada.
    total = moderation_store.registrar_infraccion(session_id)

    nivel = min(total, 5)
    minutos = PENALIZACIONES[nivel]

    # Primera infracción: advertencia formal.
    if minutos == 0:
        return {
            "infracciones": total,
            "estado": "ADVERTENCIA",
            "mensaje": (
                "Esta es tu primera infracción. "
                "Recibes una advertencia formal."
            )
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

# ==========================================
# EVALUAR MODERACIÓN
# ==========================================

def evaluar_moderacion(session_id, resultado_modelo):
    """
    Evalúa la predicción del modelo y determina
    si corresponde permitir, advertir o sancionar.

    Políticas:

    NO:
        Comentario permitido.

    NOE:
        Tres advertencias generan una infracción.

    OFG / OFP:
        Generan una infracción directamente.
    """

    categoria = resultado_modelo["categoria_predicha"]
    probabilidades = resultado_modelo["probabilidades"]
    margen = resultado_modelo["margen"]

    confianza = probabilidades[categoria]

    infracciones = moderation_store.obtener_infracciones(
        session_id
    )

    advertencias = moderation_store.obtener_advertencias_vulgaridad(
        session_id
    )

    # ==========================================
    # OFENSIVO HACIA PERSONA O GRUPO
    # ==========================================

    # Comprobar si existe una infracción con suficiente confianza.
    if categoria in ("OFP", "OFG"):

        # Registrar infracción directamente.
        sancion = procesar_infraccion(session_id)

        return {
            **sancion,
            "categoria_predicha": categoria,
            "confianza": confianza,
            "margen": margen,
            "tipo_infraccion": "DIRECTA",
            "advertencias_vulgaridad": advertencias
        }

    # ==========================================
    # VULGAR U OBSCENO
    # ==========================================
    
    # Lenguaje obsceno no necesariamente ofensivo.
    if categoria == "NOE":

        # Registrar una nueva advertencia.
        total_advertencias = (
            moderation_store.registrar_advertencia_vulgaridad(
                session_id
            )
        )

        # Comprobar si alcanzó el límite.
        if total_advertencias >= LIMITE_ADVERTENCIAS_VULGARIDAD:

            # Reiniciar el contador de vulgaridad.
            moderation_store.reiniciar_advertencias_vulgaridad(
                session_id
            )

            # Convertir las tres advertencias en una infracción.
            sancion = procesar_infraccion(session_id)

            return {
                **sancion,
                "categoria_predicha": categoria,
                "confianza": confianza,
                "margen": margen,
                "tipo_infraccion": "POR_REINCIDENCIA",
                "advertencias_vulgaridad": 0,
                "advertencias_convertidas": total_advertencias,
                "mensaje_moderacion": (
                    "Has acumulado tres advertencias por "
                    "lenguaje vulgar. Se ha registrado una infracción."
                )
            }

        # Todavía no alcanza el límite.
        return {
            "estado": "ADVERTENCIA_VULGAR",
            "infracciones": infracciones,
            "categoria_predicha": categoria,
            "confianza": confianza,
            "margen": margen,
            "tipo_infraccion": None,
            "advertencias_vulgaridad": total_advertencias,
            "advertencias_restantes": (
                LIMITE_ADVERTENCIAS_VULGARIDAD
                - total_advertencias
            ),
            "mensaje": (
                "El comentario contiene lenguaje vulgar u obsceno. "
                f"Esta es tu advertencia {total_advertencias} "
                f"de {LIMITE_ADVERTENCIAS_VULGARIDAD}. "
                "Si acumulas tres advertencias, se registrará "
                "una infracción."
            )
        }

    # ==========================================
    # COMENTARIO NO OFENSIVO
    # ==========================================

    if categoria == "NO":

        return {
            "estado": "PERMITIDO",
            "infracciones": infracciones,
            "categoria_predicha": categoria,
            "confianza": confianza,
            "margen": margen,
            "tipo_infraccion": None,
            "advertencias_vulgaridad": advertencias,
            "mensaje": "El comentario ha sido permitido."
        }

    # ==========================================
    # CATEGORÍA NO RECONOCIDA
    # ==========================================

    return {
        "estado": "SIN_CLASIFICACION",
        "infracciones": infracciones,
        "categoria_predicha": categoria,
        "confianza": confianza,
        "margen": margen,
        "advertencias_vulgaridad": advertencias,
        "mensaje": (
            "No se reconoce la categoría del comentario. "
            "No se ha aplicado ninguna sanción."
        )
    }
