import re
import spacy
from nltk.corpus import stopwords
from nltk.stem import SnowballStemmer


# Cargar modelo lingüístico español
nlp = spacy.load("es_core_news_sm")

# Cargar stopwords y proteger las negaciones
stopwords_es = set(stopwords.words("spanish"))

negaciones = {"no", "nunca", "jamás", "jamas", "sin", "tampoco"}
stopwords_es = stopwords_es - negaciones

# Inicializar stemmer español
stemmer = SnowballStemmer("spanish")


def preprocesar_texto(texto, metodo="lema"):
    """
    Normaliza y procesa un comentario.

    metodo:
        'lema': utiliza lematización.
        'stem': utiliza stemming.
    """
    if metodo not in ("lema", "stem"):
        raise ValueError("El método debe ser 'lema' o 'stem'")

    texto = str(texto).lower()
    texto = re.sub(r'\s+', ' ', texto).strip()

    doc = nlp(texto)
    palabras = []

    for token in doc:
        if token.is_space or token.is_punct:
            continue

        palabra = token.text.lower()

        if palabra in stopwords_es:
            continue

        if metodo == "lema":
            palabra = token.lemma_.lower()
        else:
            palabra = stemmer.stem(palabra)

        palabras.append(palabra)

    return " ".join(palabras)
