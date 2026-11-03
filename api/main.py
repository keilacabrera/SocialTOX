
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.models.offendes_moderacion import analizar_comentario


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


@app.post("/analizar")
def analizar(solicitud: SolicitudAnalisis):

    comentario = solicitud.comentario.strip()

    if not comentario:
        raise HTTPException(
            status_code=400,
            detail="El comentario no puede estar vacío."
        )

    resultado = analizar_comentario(comentario)

    return resultado
