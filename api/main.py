
import os

from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware

from src.models.offendes_moderacion import analizar_comentario
from api.moderation_store import moderation_store
from api.moderation_service import evaluar_moderacion

app = FastAPI(
    title="SocialTOX API",
    description="API para detección y moderación de lenguaje ofensivo",
    version="1.0.0"
)

# Configuración CORS para conectar Vue con FastAPI
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

# Configuración de sesiones.
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv(
        "SOCIALTOX_SESSION_SECRET",
        "clave-temporal-solo-para-desarrollo"
    ),
    same_site="lax",
    https_only=False
)

# Estructura de los datos que recibirá la API
class SolicitudAnalisis(BaseModel):
    comentario: str = Field(
        min_length=1,
        description="Comentario que se desea analizar"
    )


@app.get("/")
def inicio():
    return {
        "mensaje": "Bienvenido a SocialTOX API",
        "estado": "servidor funcionando"
    }


@app.get("")
def comprobar_salud():
    return {
        "estado": "correcto",
        "servicio": "SocialTOX Backend"
    }


@app.get("/sesion")
def obtener_sesion(request: Request):

    # Crear un identificador si la sesión todavía no existe.
    if "session_id" not in request.session:
        request.session["session_id"] = str(uuid4())

    session_id = request.session["session_id"]

    return {
        "estado": "correcto",
        "infracciones": moderation_store.obtener_infracciones(session_id)
    }

# @app.post("/analizar")
# def analizar(solicitud: SolicitudAnalisis):

#     comentario = solicitud.comentario.strip()

#     if not comentario:
#         raise HTTPException(
#             status_code=400,
#             detail="El comentario no puede estar vacío."
#         )

#     resultado = analizar_comentario(comentario)

#     return resultado

@app.post("/analizar")
def analizar(solicitud: SolicitudAnalisis, request: Request):

    comentario = solicitud.comentario.strip()

    if not comentario:
        raise HTTPException(
            status_code=400,
            detail="El comentario no puede estar vacío."
        )

    # Obtener o crear el identificador de sesión.
    if "session_id" not in request.session:
        request.session["session_id"] = str(uuid4())

    session_id = request.session["session_id"]

    # Comprobar si existe una restricción activa.
    restriccion = moderation_store.obtener_restriccion(session_id)

    if restriccion is not None:

        tiempo_restante = int(
            (restriccion - datetime.now(timezone.utc)).total_seconds()
        )

        raise HTTPException(
            status_code=429,
            detail={
                "estado": "RESTRINGIDO",
                "tiempo_restante_segundos": max(0, tiempo_restante),
                "fecha_fin": restriccion.isoformat(),
                "mensaje": "Tienes una restricción activa."
            }
        )

    # Analizar el comentario con el modelo NLP.
    resultado_modelo = analizar_comentario(comentario)

    # Evaluar la predicción y aplicar la moderación correspondiente.
    resultado_moderacion = evaluar_moderacion(
        session_id,
        resultado_modelo
    )

    # resultado = analizar_comentario(comentario)

    # return resultado
    # Combinar los resultados del modelo y de moderación.
    return {
        **resultado_modelo,
        "moderacion": resultado_moderacion
    }