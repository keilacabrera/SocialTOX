
import os
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel, Field

from src.models.offendes_moderacion import analizar_comentario
from api.moderation_store import moderation_store
from api.moderation_service import evaluar_moderacion

import json
from pathlib import Path

from time import perf_counter
from api.estadisticas_store import estadisticas_store

# ==========================================
# CONFIGURACIÓN DE RUTAS DEL PROYECTO
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent

RUTA_METRICAS = BASE_DIR / "resultados" / "resultados_modelos.json"

# ==========================================
# CONFIGURACIÓN PRINCIPAL
# ==========================================

app = FastAPI(
    title="SocialTOX API",
    description="API para detección y moderación de lenguaje ofensivo",
    version="1.0.0"
)


# ==========================================
# CONFIGURACIÓN CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# CONFIGURACIÓN DE SESIONES
# ==========================================

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv(
        "SOCIALTOX_SESSION_SECRET",
        "clave-temporal-solo-para-desarrollo"
    ),
    same_site="lax",
    https_only=False
)


# ==========================================
# MODELO DE DATOS
# ==========================================

class SolicitudAnalisis(BaseModel):
    comentario: str = Field(
        min_length=1,
        description="Comentario que se desea analizar"
    )


# ==========================================
# FUNCIÓN AUXILIAR PARA SESIONES
# ==========================================

def obtener_session_id(request: Request):

    if "session_id" not in request.session:
        request.session["session_id"] = str(uuid4())

    return request.session["session_id"]


# ==========================================
# RUTA PRINCIPAL
# ==========================================

@app.get("/")
def inicio():
    return {
        "mensaje": "Bienvenido a SocialTOX API",
        "estado": "servidor funcionando"
    }


# ==========================================
# ESTADO DEL SERVIDOR
# ==========================================

@app.get("/api/salud")
def comprobar_salud():
    return {
        "estado": "correcto",
        "servicio": "SocialTOX Backend"
    }


# ==========================================
# OBTENER ESTADO DE SESIÓN
# ==========================================

# @app.get("/api/sesion")
# def obtener_sesion(request: Request):

#     session_id = obtener_session_id(request)

#     infracciones = moderation_store.obtener_infracciones(
#         session_id
#     )

#     restriccion = moderation_store.obtener_restriccion(
#         session_id
#     )

#     if restriccion is not None:

#         tiempo_restante = max(
#             0,
#             int(
#                 (
#                     restriccion - datetime.now(timezone.utc)
#                 ).total_seconds()
#             )
#         )

#         if tiempo_restante > 0:
#             return {
#                 "estado": "RESTRINGIDO",
#                 "infracciones": infracciones,
#                 "tiempo_restante_segundos": tiempo_restante,
#                 "fecha_fin": restriccion.isoformat()
#             }

#     return {
#         "estado": "ACTIVO",
#         "infracciones": infracciones,
#         "tiempo_restante_segundos": 0
#     }

# ==========================================
# OBTENER ESTADO DE SESIÓN
# ==========================================

@app.get("/api/sesion")
def obtener_sesion(request: Request):
    session_id = obtener_session_id(request)

    infracciones = moderation_store.obtener_infracciones(session_id)

    advertencias_vulgaridad = (
        moderation_store.obtener_advertencias_vulgaridad(session_id)
    )

    restriccion = moderation_store.obtener_restriccion(session_id)

    if restriccion is not None:
        tiempo_restante = max(
            0,
            int(
                (
                    restriccion - datetime.now(timezone.utc)
                ).total_seconds()
            )
        )

        if tiempo_restante > 0:
            return {
                "estado": "RESTRINGIDO",
                "infracciones": infracciones,
                "advertencias_vulgaridad": advertencias_vulgaridad,
                "tiempo_restante_segundos": tiempo_restante,
                "fecha_fin": restriccion.isoformat()
            }

    return {
        "estado": "ACTIVO",
        "infracciones": infracciones,
        "advertencias_vulgaridad": advertencias_vulgaridad,
        "tiempo_restante_segundos": 0
    }



# ==========================================
# ANALIZAR COMENTARIO Y MODERAR
# ==========================================

@app.post("/api/analizar")
def analizar(
    solicitud: SolicitudAnalisis,
    request: Request
):

    comentario = solicitud.comentario.strip()

    # Validar que el comentario no esté vacío.
    if not comentario:
        raise HTTPException(
            status_code=400,
            detail="El comentario no puede estar vacío."
        )

    # Obtener la sesión del usuario.
    session_id = obtener_session_id(request)

    # Comprobar si existe una restricción.
    restriccion = moderation_store.obtener_restriccion(
        session_id
    )

    if restriccion is not None:

        tiempo_restante = max(
            0,
            int(
                (
                    restriccion - datetime.now(timezone.utc)
                ).total_seconds()
            )
        )

        if tiempo_restante > 0:
            raise HTTPException(
                status_code=429,
                detail={
                    "estado": "RESTRINGIDO",
                    "tiempo_restante_segundos": tiempo_restante,
                    "fecha_fin": restriccion.isoformat(),
                    "mensaje": "Tienes una restricción activa."
                }
            )

    # ==========================================
    # INICIAR CRONÓMETRO
    # ==========================================

    inicio_analisis = perf_counter()

    # Analizar el comentario mediante OffendES.
    resultado_modelo = analizar_comentario(
        comentario
    )

    # Evaluar y aplicar moderación.
    resultado_moderacion = evaluar_moderacion(
        session_id,
        resultado_modelo
    )

    # ==========================================
    # REGISTRAR ESTADÍSTICAS EN VIVO
    # ==========================================

    latencia_ms = (perf_counter() - inicio_analisis) * 1000

    estadisticas_store.registrar_analisis(
        resultado_modelo,
        resultado_moderacion,
        latencia_ms
    )

    # ==========================================
    # DEVOLVER RESULTADOS
    # ==========================================

    return {
        **resultado_modelo,
        "moderacion": resultado_moderacion
    }



@app.get("/api/metricas")
def obtener_metricas():

    if not RUTA_METRICAS.is_file():
        raise HTTPException(
            status_code=404,
            detail="No se encontró resultados_modelos.json"
        )

    try:
        with RUTA_METRICAS.open(
            "r", encoding="utf-8"
        ) as archivo:
            return json.load(archivo)

    except (OSError, json.JSONDecodeError):
        raise HTTPException(
            status_code=500,
            detail="No se pudieron leer las métricas"
        )

 # ==========================================
# ESTADÍSTICAS EN VIVO
# ==========================================

@app.get("/api/estadisticas")
def obtener_estadisticas():
    return estadisticas_store.obtener_resumen()

