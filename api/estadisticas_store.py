
from collections import Counter
from threading import Lock

class EstadisticasStore:
    def __init__(self):
        self.lock = Lock()
        self.total = 0
        self.categorias = Counter({
            "NO": 0,
            "NOE": 0,
            "OFG": 0,
            "OFP": 0
        })
        self.infracciones_registradas = 0
        self.restricciones_aplicadas = 0
        self.tiempo_total_ms = 0.0

    def registrar_analisis(self, resultado, moderacion, latencia_ms):
        categoria = resultado.get("categoria_predicha")

        with self.lock:
            self.total += 1

            if categoria in self.categorias:
                self.categorias[categoria] += 1

            if moderacion.get("estado") == "RESTRINGIDO":
                self.restricciones_aplicadas += 1

            # Contar nuevas infracciones, no el acumulado
            # de infracciones de toda la sesión.
            if moderacion.get("estado") in (
                "INFRACCION",
                "ADVERTENCIA",
                "RESTRINGIDO"
            ):
                self.infracciones_registradas += 1

            self.tiempo_total_ms += latencia_ms

    def obtener_resumen(self):
        with self.lock:
            promedio = (
                self.tiempo_total_ms / self.total
                if self.total else 0
            )

            return {
                "total_comentarios": self.total,
                "categorias": dict(self.categorias),
                "comentarios_ofensivos": (
                    self.categorias["OFP"] +
                    self.categorias["OFG"]
                ),
                "infracciones_registradas": self.infracciones_registradas,
                "restricciones_aplicadas": self.restricciones_aplicadas,
                "latencia_promedio_ms": round(promedio, 2)
            }


estadisticas_store = EstadisticasStore()
