
from datetime import datetime, timedelta, timezone


class ModerationStore:
    def __init__(self):
        # Almacena las infracciones confirmadas por sesión.
        self.infracciones = {}

        # Almacena las restricciones temporales.
        self.restricciones = {}

        # Almacena las advertencias por lenguaje vulgar.
        self.advertencias_vulgaridad = {}

    # ==========================================
    # GESTIÓN DE INFRACCIONES
    # ==========================================    

    def registrar_infraccion(self, session_id):
        """Registra una infracción confirmada para una sesión."""

        if session_id not in self.infracciones:
            self.infracciones[session_id] = 0

        self.infracciones[session_id] += 1

        return self.infracciones[session_id]

    def obtener_infracciones(self, session_id):
        """Devuelve la cantidad de infracciones de una sesión."""

        return self.infracciones.get(session_id, 0)

    # ==========================================
    # GESTIÓN DE ADVERTENCIAS POR VULGARIDAD
    # ==========================================

    def registrar_advertencia_vulgaridad(self, session_id):
        """Registra una advertencia por lenguaje vulgar."""

        if session_id not in self.advertencias_vulgaridad:
            self.advertencias_vulgaridad[session_id] = 0

        self.advertencias_vulgaridad[session_id] += 1

        return self.advertencias_vulgaridad[session_id]

    def obtener_advertencias_vulgaridad(self, session_id):
        """Devuelve las advertencias acumuladas por vulgaridad."""

        return self.advertencias_vulgaridad.get(session_id, 0)

    def reiniciar_advertencias_vulgaridad(self, session_id):
        """Reinicia el contador después de alcanzar tres advertencias."""

        self.advertencias_vulgaridad[session_id] = 0

    # ==========================================
    # GESTIÓN DE RESTRICCIONES
    # ==========================================

    def aplicar_restriccion(self, session_id, minutos):
        """Establece una restricción temporal."""

        fecha_fin = datetime.now(timezone.utc) + timedelta(
            minutes=minutos
        )

        self.restricciones[session_id] = fecha_fin

        return fecha_fin

    def obtener_restriccion(self, session_id):
        """Devuelve la restricción activa, si existe."""

        fecha_fin = self.restricciones.get(session_id)

        if fecha_fin is None:
            return None

        if datetime.now(timezone.utc) >= fecha_fin:
            del self.restricciones[session_id]
            return None

        return fecha_fin


# Instancia compartida del almacenamiento.
moderation_store = ModerationStore()
