import os
import html
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import feedparser
from openai import OpenAI
from dotenv import load_dotenv
from bs4 import BeautifulSoup

# Intentar cargar claves (si falla no explota, pero no habrá IA)
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SolicitudNoticias(BaseModel):
    urls: List[str]

class SolicitudPost(BaseModel):
    titulo: str
    resumen: str
    fuente: str

# --- EL DISFRAZ DE NAVEGADOR ---
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def limpiar_texto(texto_sucio):
    if not texto_sucio: return "Haz clic para leer más."
    try:
        texto_str = str(texto_sucio)
        texto_decodificado = html.unescape(texto_str)
        soup = BeautifulSoup(texto_decodificado, "html.parser")
        texto_limpio = soup.get_text(separator=" ")
        return " ".join(texto_limpio.split())
    except: return "Resumen no disponible."

def detectar_feed_rss(url_usuario):
    url_limpia = url_usuario.strip().rstrip('/')
    posibles = [url_limpia, f"{url_limpia}/feed", f"{url_limpia}/rss", f"{url_limpia}/rss.xml"]
    
    for opcion in posibles:
        try:
            # DESCARGAMOS USANDO EL DISFRAZ
            resp = requests.get(opcion, headers=HEADERS, timeout=5)
            if resp.status_code == 200:
                feed = feedparser.parse(resp.content)
                if feed.entries: return opcion
        except: continue
    return None

@app.get("/")
def leer_raiz():
    return {"mensaje": "API con User-Agent activa 🕵️"}

@app.post("/obtener-noticias")
def obtener_noticias_personalizadas(solicitud: SolicitudNoticias):
    todas_las_noticias = []
    errores = []
    
    print(f"Procesando {len(solicitud.urls)} fuentes...") 
    
    for url in solicitud.urls:
        # 1. Detectar URL real
        url_feed = detectar_feed_rss(url)
        
        if not url_feed:
            # Último intento: probar con la URL original directa
            url_feed = url 
        
        try:
            # 2. DESCARGAR CONTENIDO COMO SI FUÉRAMOS CHROME
            response = requests.get(url_feed, headers=HEADERS, timeout=10)
            response.raise_for_status() # Lanza error si la web da 403/404
            
            # 3. Leer el contenido descargado
            feed = feedparser.parse(response.content)
            
            if not feed.entries:
                errores.append(url)
                continue
                
            for entrada in feed.entries[:1]: 
                resumen_raw = ""
                if 'summary' in entrada: resumen_raw = entrada.summary
                elif 'description' in entrada: resumen_raw = entrada.description
                elif 'content' in entrada: resumen_raw = entrada.content[0].value
                
                resumen_limpio = limpiar_texto(resumen_raw)
                
                # Parche visual
                if "{" in resumen_limpio or "window." in resumen_limpio:
                    resumen_limpio = "Haz clic en LEER para ver el artículo."

                noticia = {
                    "titulo": entrada.title,
                    "link": entrada.link,
                    "resumen": resumen_limpio[:350] + "...", 
                    "fuente": feed.feed.title if 'title' in feed.feed else "Fuente Web",
                    "url_origen": url # <--- ESTA ES LA CLAVE PARA EL COLOR
                }
                todas_las_noticias.append(noticia)
                
        except Exception as e:
            print(f"Bloqueo o error en {url}: {e}")
            errores.append(url)
            continue
            
    return {
        "noticias": todas_las_noticias,
        "fallos": errores
    }

@app.post("/generar-post")
def generar_post_ia(solicitud: SolicitudPost):
    if not client:
        return {"contenido": "Error: API Key no configurada. Revisa tu archivo .env"}
        
    try:
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Eres un experto en redes sociales."},
                {"role": "user", "content": f"Crea un post de LinkedIn (sin emojis) para: {solicitud.titulo}"}
            ]
        )
        return {"contenido": completion.choices[0].message.content}
    except Exception as e:
        return {"contenido": f"Error OpenAI: {str(e)}"}