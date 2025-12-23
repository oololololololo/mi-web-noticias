import os
import html
import asyncio
import httpx
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from typing import List
import feedparser
from openai import OpenAI
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import re
from supabase import create_client, Client
import json

# Intentar cargar claves
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None


# Configuración Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase_client: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error inicializando Supabase: {e}")
else:
    print("Advertencia: SUPABASE_URL o SUPABASE_KEY no configurados.")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# --- HEADER NAVEGADOR ---
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

# --- CACHÉ EN MEMORIA (Simple para MVP) ---
CACHE_NOTICIAS = {}
CACHE_FEED_URLS = {} # Cache para mapear url_usuario -> url_feed_real
TIEMPO_EXPIRACION_CACHE = 15 * 60  # 15 minutos

async def detectar_feed_rss(client_http, url_usuario):
    # 1. Check cache de URLs conocidas
    if url_usuario in CACHE_FEED_URLS:
        return CACHE_FEED_URLS[url_usuario]

    url_limpia = url_usuario.strip().rstrip('/')
    posibles = [url_limpia, f"{url_limpia}/feed", f"{url_limpia}/rss", f"{url_limpia}/rss.xml"]
    
    # Función auxiliar para probar una URL individualmente
    async def probar_url(url):
        try:
            resp = await client_http.get(url, timeout=3.0) # Timeout reducido a 3s
            if resp.status_code == 200:
                try:
                    feed = feedparser.parse(resp.content)
                    if feed.entries: return url
                except:
                    pass
        except: 
            return None
        return None

    # Ejecutar todas las pruebas en paralelo
    tareas = [probar_url(opcion) for opcion in posibles]
    resultados = await asyncio.gather(*tareas)
    
    # Retornar la primera que haya funcionado y guardar en cache
    for res in resultados:
        if res: 
            CACHE_FEED_URLS[url_usuario] = res
            return res
    return None

async def procesar_url(client_http, url):
    import time 
    
    # 1. CHECK CACHE NOTICIAS
    if url in CACHE_NOTICIAS:
        timestamp, data = CACHE_NOTICIAS[url]
        if time.time() - timestamp < TIEMPO_EXPIRACION_CACHE:
            return data, None

    try:
        url_feed = await detectar_feed_rss(client_http, url)
        if not url_feed: url_feed = url 
        
        response = await client_http.get(url_feed, timeout=6.0) # Timeout total reducido a 6s
        response.raise_for_status()
        
        feed = feedparser.parse(response.content)
        if not feed.entries: return None, url
            
        noticias_encontradas = []
        for entrada in feed.entries[:3]: 
            resumen_raw = ""
            if 'summary' in entrada: resumen_raw = entrada.summary
            elif 'description' in entrada: resumen_raw = entrada.description
            elif 'content' in entrada: resumen_raw = entrada.content[0].value
            
            resumen_limpio = limpiar_texto(resumen_raw)
            if "{" in resumen_limpio or "window." in resumen_limpio:
                resumen_limpio = "Haz clic en LEER para ver el artículo."

            noticia = {
                "titulo": entrada.title,
                "link": entrada.link,
                "resumen": resumen_limpio[:350] + "...", 
                "fuente": feed.feed.title if 'title' in feed.feed else "Fuente Web",
                "url_origen": url
            }
            noticias_encontradas.append(noticia)
            
        # 2. GUARDAR EN CACHE
        if noticias_encontradas:
            CACHE_NOTICIAS[url] = (time.time(), noticias_encontradas)

        return noticias_encontradas, None

    except Exception as e:
        print(f"Error procesando {url}: {e}")
        return None, url

class SolicitudNoticias(BaseModel):
    urls: List[str]

class SolicitudPost(BaseModel):
    titulo: str
    resumen: str
    fuente: str
    estilo: str = "Formal"
    idioma: str = "Español"
    longitud: str = "Medio"

class SolicitudRecomendacion(BaseModel):
    tema: str
    urls_existentes: List[str] = []

# --- DEPENDENCIAS AUTH ---
from fastapi import Header, HTTPException, Depends

async def verify_premium_user(authorization: str = Header(None)):
    print(f"DEBUG: Verificando usuario. Token recibido: {authorization is not None}")
    
    if not authorization:
        print("DEBUG: No authorization header")
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    
    token = authorization.replace("Bearer ", "")
    
    # Si no hay cliente supabase, modo inseguro/dev? Mejor bloquear.
    if not supabase_client:
         print("DEBUG: supabase_client es None. Fallo configuración.")
         if os.getenv("MODO_DEV_INSEGURO") == "true": # Backdoor temporal solo si se define explícitamente
             print("DEBUG: Modo dev inseguro activado. BYPASS.")
             return None
             
         raise HTTPException(status_code=500, detail="Error configuración servidor: Supabase no conectado")

    try:
        # Verificar token con Supabase
        user_response = supabase_client.auth.get_user(token)
        user = user_response.user
        email = user.email if user else "No email"
        print(f"DEBUG: Usuario autenticado: {email}")
        
        # Verificar metadata
        # Asumimos que el admin pone { "is_premium": true } en user_metadata
        is_premium = user.user_metadata.get('is_premium', False)
        print(f"DEBUG: Status Premium: {is_premium}")
        
        if not is_premium:
            # Hardcoded admin bypass para ti
            if email == "tobias.alguibay@gmail.com":
                print("DEBUG: Admin bypass concedido.")
                return user
                
            print("DEBUG: Acceso denegado. No es premium ni admin.")
            raise HTTPException(status_code=403, detail="Requiere suscripción Premium. Contacta al admin.")
            
        return user
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error auth debug: {e}")
        # Si falla la verificación del token en sí (expirado, etc)
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


@app.post("/stream-noticias")
async def stream_noticias(solicitud: SolicitudNoticias):
    async def generador_eventos():
        semaforo = asyncio.Semaphore(5) # Máximo 5 fuentes simultáneas para no saturar

        async def procesar_con_limite(client, url):
            async with semaforo:
                return await procesar_url(client, url)

        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, verify=False) as client_http:
            # Crear tareas envueltas en el semáforo
            futuros = [procesar_con_limite(client_http, url) for url in solicitud.urls]
            
            # Procesar conforme terminan
            for futuro in asyncio.as_completed(futuros):
                noticias, url_origen = await futuro
                
                if noticias:
                    payload = {
                        "url": url_origen,
                        "status": "ok",
                        "noticias": noticias
                    }
                else:
                    payload = {
                        "url": url_origen,
                        "status": "error"
                    }
                
                yield json.dumps(payload) + "\n"

    return StreamingResponse(generador_eventos(), media_type="application/x-ndjson")

@app.post("/generar-post")
def generar_post_ia(solicitud: SolicitudPost, user = Depends(verify_premium_user)):

    if not client: return {"contenido": "Error: API Key no configurada"}
    
    # Construir prompt personalizado
    longitud_instruccion = ""
    if solicitud.longitud == "Corto":
        longitud_instruccion = "Maximo 30 palabras. Muy conciso."
    elif solicitud.longitud == "Largo":
        longitud_instruccion = "Minimo 150 palabras. Detallado y profundo."
    else:
        longitud_instruccion = "Entre 50 y 80 palabras. Equilibrado."

    prompt_sys = f"Eres un experto en redes sociales. Escribe en {solicitud.idioma}."
    prompt_user = (
        f"Crea un post de LinkedIn con estilo '{solicitud.estilo}'.\n"
        f"Restriccion de longitud: {longitud_instruccion}\n"
        f"Basado en esta noticia: {solicitud.titulo}\n"
        f"Resumen: {solicitud.resumen}\n"
        f"Fuente: {solicitud.fuente}\n"
        "REGLAS CRÍTICAS:\n"
        "1. PROHIBIDO USAR EMOJIS. No uses ni uno solo.\n"
        "2. Solo el texto del post, sin introducciones."
    )

    try:
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": prompt_sys},
                {"role": "user", "content": prompt_user}
            ]
        )
        return {"contenido": completion.choices[0].message.content}
    except Exception as e:
        return {"contenido": f"Error OpenAI: {str(e)}"}

@app.post("/recomendar-fuentes")
async def recomendar_fuentes_ia(solicitud: SolicitudRecomendacion, user = Depends(verify_premium_user)):

    tema_normalizado = solicitud.tema.lower().strip()
    urls_usuario = set(solicitud.urls_existentes)
    
    print(f"Buscando: '{tema_normalizado}' (Usuario tiene {len(urls_usuario)} fuentes)")

    resultados_cache = []
    
    # 1. ⚡ CHECK CACHÉ SUPABASE
    if supabase_client:
        try:
            data = supabase_client.table("search_cache").select("results").eq("query", tema_normalizado).execute()
            if data.data and len(data.data) > 0:
                resultados_cache = data.data[0]['results']
                print(f"✅ Cache tiene {len(resultados_cache)} fuentes")
        except Exception as e:
            print(f"⚠️ Error caché: {e}")
    else:
        print("⚠️ Supabase no configurado: saltando check de caché")

    # 2. FILTRAR LO QUE EL USUARIO YA TIENE
    sugerencias_utiles = [f for f in resultados_cache if f['url'] not in urls_usuario]
    
    # SI HAY SUFICIENTES (>2), RETORNAMOS RÁPIDO Y BARATO
    if len(sugerencias_utiles) >= 2:
        print(f"🚀 Retornando {len(sugerencias_utiles)} fuentes del caché (útiles)")
        return {"fuentes": sugerencias_utiles}

    # 3. 🤖 GENERAR NUEVAS CON IA
    print("🤖 Caché insuficiente. Consultando a GPT...")
    
    if not client: return {"error": "Sin API Key"}
    
    # Ignorar las del usuario y las del caché (para no repetir)
    lista_ignorar = list(urls_usuario)[:20] + [f['url'] for f in resultados_cache]
    str_ignorar = ", ".join(lista_ignorar)
    
    try:
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Eres un experto en RSS."},
                {"role": "user", "content": f"Necesito 5 feeds RSS VERIFICADOS sobre: {solicitud.tema}. \nIMPORTANTE: NO incluyas: {str_ignorar}. \nDame URLs diferentes. Solo las URLs."}
            ]
        )
        contenido = completion.choices[0].message.content
        posibles_urls = re.findall(r'https?://[^\s,]+', contenido)
        posibles_urls = [u.strip('",.') for u in posibles_urls]
        
    except Exception as e:
        return {"error": f"Error IA: {str(e)}"}

    # 4. 🛡️ VALIDAR URLS NUEVAS
    feeds_nuevos = []
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, verify=False) as client_http:
        tareas = [detectar_feed_rss(client_http, url) for url in posibles_urls]
        resultados = await asyncio.gather(*tareas, return_exceptions=True)
        
        for i, res in enumerate(resultados):
            if isinstance(res, Exception): continue
            if res and res not in urls_usuario: 
                feeds_nuevos.append({"url": res, "titulo": posibles_urls[i]})

    # 5. 💾 MERGE Y ACTUALIZAR CACHÉ
    urls_en_cache = {f['url'] for f in resultados_cache}
    cache_final = resultados_cache + [f for f in feeds_nuevos if f['url'] not in urls_en_cache]
    
    if feeds_nuevos and supabase_client:
        try:
            supabase_client.table("search_cache").upsert({
                "query": tema_normalizado,
                "results": cache_final
            }, on_conflict="query").execute()
            print(f"💾 Caché actualizado con {len(feeds_nuevos)} fuentes nuevas")
        except Exception as e:
            print(f"⚠️ Error actualizando DB: {e}")

    finales = [f for f in cache_final if f['url'] not in urls_usuario]
    return {"fuentes": finales}