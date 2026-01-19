import { useState, useCallback, useEffect, useRef } from 'react'
import axios from 'axios'
import { supabase } from '../supabaseClient'

// Tiempos de caché
const TIEMPO_CACHE_FRESCO = 15 * 60 * 1000  // 15 min - se considera "fresco"
const TIEMPO_CACHE_STALE = 24 * 60 * 60 * 1000  // 24h - máximo tiempo para mostrar stale
const CACHE_KEY_GRANULAR = 'noticias_url_cache_v2'

// --- DEBOUNCE PARA ESCRITURAS A LOCALSTORAGE ---
// Evita escribir en cada chunk del stream (20+ veces por recarga)
let cacheWriteTimer = null
const pendingCacheUpdates = {}

const debouncedCacheWrite = () => {
    if (cacheWriteTimer) clearTimeout(cacheWriteTimer)
    cacheWriteTimer = setTimeout(() => {
        try {
            const currentCache = JSON.parse(localStorage.getItem(CACHE_KEY_GRANULAR) || '{}')
            const merged = { ...currentCache, ...pendingCacheUpdates }
            localStorage.setItem(CACHE_KEY_GRANULAR, JSON.stringify(merged))
            // Limpiar pending updates
            Object.keys(pendingCacheUpdates).forEach(k => delete pendingCacheUpdates[k])
        } catch (e) {
            console.error('Error escribiendo caché:', e)
        }
    }, 1000) // Escribir máximo cada 1 segundo
}

export function useFeeds(cajas, cajasVisibles, session) {

    const [fuentes, setFuentes] = useState([])
    const [noticias, setNoticias] = useState([])

    // "cargandoNoticias" ahora significará "hay peticiones en vuelo",
    // pero no necesariamente que la pantalla esté vacía.
    const [cargandoNoticias, setCargandoNoticias] = useState(false)
    const [estadoFuentes, setEstadoFuentes] = useState({})
    const [procesandoUrls, setProcesandoUrls] = useState(new Set())

    // Cargar fuentes iniciales
    useEffect(() => {
        if (cajas.length > 0) fetchFuentesTodas()
    }, [cajas])

    const fetchFuentesTodas = useCallback(async () => {
        const { data } = await supabase.from('sources').select('*')
        if (data) setFuentes(data)
    }, [])

    const agregarFuente = async (cajaId, url) => {
        const { error } = await supabase.from('sources').insert([{ box_id: cajaId, url: url }])
        if (!error) fetchFuentesTodas()
        return error
    }

    const borrarFuente = async (id) => {
        await supabase.from('sources').delete().eq('id', id)
        fetchFuentesTodas()
    }

    // Procesa colores usando Map pre-computado para O(1) lookup
    const procesarColores = useCallback((listaNoticias, fuentesActuales, cajasActuales) => {
        // Pre-computar mapa URL -> Color (evita búsquedas O(n) repetidas)
        const urlToColor = new Map()
        for (const fuente of fuentesActuales) {
            const caja = cajasActuales.find(c => c.id === fuente.box_id)
            urlToColor.set(fuente.url, caja?.color ?? '#000')
        }

        return listaNoticias.map(noticia => ({
            ...noticia,
            color: urlToColor.get(noticia.url_origen) ?? '#000'
        }))
    }, [])

    // Lógica Central de Carga
    const cargarNoticiasAPI = useCallback((urlsObjetivo, forzarRecarga = false) => {
        // 0. Deduplicar URLs de entrada para evitar peticiones redundantes
        const urlsUnicas = [...new Set(urlsObjetivo)]

        if (urlsUnicas.length === 0) {
            setNoticias([])
            return
        }

        const ahora = Date.now()
        // 1. Leer Caché Granular
        let cacheGlobal = {}
        try {
            const raw = localStorage.getItem(CACHE_KEY_GRANULAR)
            if (raw) cacheGlobal = JSON.parse(raw)
        } catch (e) {
            console.error("Error leyendo caché", e)
        }

        const noticiasListas = []
        const urlsFaltantes = []
        const urlsStale = []  // URLs con cache expirado pero usable
        const nuevosEstados = {}

        // 2. Clasificar URLs (Fresco / Stale / Miss)
        urlsUnicas.forEach(url => {
            if (!forzarRecarga && cacheGlobal[url]) {
                const entry = cacheGlobal[url]
                const edad = ahora - entry.timestamp

                // Siempre mostrar si tiene datos (hasta 24h)
                if (edad < TIEMPO_CACHE_STALE) {
                    noticiasListas.push(...entry.noticias)
                    nuevosEstados[url] = 'ok'

                    // Si está expirado (>15min), refrescar en background
                    if (edad >= TIEMPO_CACHE_FRESCO) {
                        urlsStale.push(url)
                    }
                } else {
                    // Cache muy viejo (>24h), buscar nuevo
                    urlsFaltantes.push(url)
                }
            } else {
                urlsFaltantes.push(url)
            }
        })

        // Helper para deduplicar noticias por Link
        const deduplicarNoticias = (lista) => {
            const vistos = new Set()
            return lista.filter(n => {
                if (vistos.has(n.link)) return false
                vistos.add(n.link)
                return true
            })
        }

        // 3. Renderizar INMEDIATAMENTE lo que tenemos en caché (fresco O stale)
        const noticiasCacheSinDuplicados = deduplicarNoticias(noticiasListas)
        setNoticias(procesarColores(noticiasCacheSinDuplicados, fuentes, cajas))
        setEstadoFuentes(prev => ({ ...prev, ...nuevosEstados }))

        // 4. Combinar URLs que necesitan fetch (faltantes + stale para refrescar)
        const urlsParaFetch = [...urlsFaltantes, ...urlsStale]

        // Si no hay nada que buscar, terminamos
        if (urlsParaFetch.length === 0) {
            setCargandoNoticias(false)
            return
        }

        // Solo mostrar loading si NO tenemos noticias en pantalla
        if (noticiasCacheSinDuplicados.length === 0) {
            setCargandoNoticias(true)
        }


        // 5. Buscar lo que falta + refrescar stale (STREAMING)
        setProcesandoUrls(prev => new Set([...prev, ...urlsParaFetch]))

        const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

        // Usamos fetch nativo para soportar streaming (Axios es más complejo para esto)
        fetch(`${apiUrl}/stream-noticias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urlsParaFetch })
        }).then(async response => {
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    const chunk = decoder.decode(value, { stream: true })
                    buffer += chunk

                    // Procesar líneas completas (NDJSON)
                    const lines = buffer.split('\n')
                    buffer = lines.pop() // Guardar el fragmento incompleto para la siguiente

                    for (const line of lines) {
                        if (!line.trim()) continue
                        try {
                            const data = JSON.parse(line)
                            const { url, status, noticias: nuevasNoticias = [] } = data

                            // Actualizar Cache Granular (debounced)
                            if (status === 'error') {
                                nuevosEstados[url] = 'error'
                            } else {
                                nuevosEstados[url] = 'ok'
                                // Acumular en pending, se escribirá con debounce
                                pendingCacheUpdates[url] = {
                                    timestamp: Date.now(),
                                    noticias: nuevasNoticias
                                }
                                debouncedCacheWrite()
                            }


                            // Actualizar UI progresivamente
                            if (nuevasNoticias.length > 0) {
                                setNoticias(prev => {
                                    const combinadas = [...prev, ...nuevasNoticias]
                                    const unicas = deduplicarNoticias(combinadas)
                                    return procesarColores(unicas, fuentes, cajas)
                                })
                            }
                            setEstadoFuentes(prev => ({ ...prev, [url]: status === 'error' ? 'error' : 'ok' }))

                            // Quitar de "Procesando"
                            setProcesandoUrls(prev => {
                                const next = new Set(prev)
                                next.delete(url)
                                return next
                            })

                        } catch (e) {
                            console.error("Error parseando chunk stream", e)
                        }
                    }
                }
            } catch (err) {
                console.error("Error en stream", err)
            } finally {
                setCargandoNoticias(false)
                // Limpiar cualquier URL que haya quedado colgada (por si error de red)
                setProcesandoUrls(prev => {
                    const next = new Set(prev)
                    urlsParaFetch.forEach(u => next.delete(u))
                    return next
                })
            }
        }).catch(err => {
            console.error("Error iniciando fetch stream", err)
            setCargandoNoticias(false)
            setProcesandoUrls(new Set())
        })

    }, [cajas, fuentes, procesarColores])

    // Efecto: Cuando cambia la selección de cajas
    useEffect(() => {
        if (fuentes.length > 0) {
            const urlsActivas = fuentes
                .filter(f => cajasVisibles.includes(f.box_id))
                .map(f => f.url)

            // cargarNoticiasAPI ya se encarga de deduplicar
            cargarNoticiasAPI(urlsActivas)
        } else {
            setNoticias([])
        }
    }, [cajasVisibles, fuentes, cargarNoticiasAPI])

    // 6. BUSCADOR INTELIGENTE
    const recomendarFuentes = useCallback(async (tema) => {
        try {
            // Le enviamos al backend lo que YA tenemos para que no nos recomiende repetidos
            const urlsActuales = fuentes.map(f => f.url)

            const apiUrl = import.meta.env.VITE_BACKEND_URL || 'https://mi-ap-noticias.onrender.com'
            const res = await axios.post(`${apiUrl}/recomendar-fuentes`, {
                tema,
                urls_existentes: urlsActuales
            }, {
                headers: {
                    Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
                }
            })
            return res.data.fuentes || []
        } catch (e) {
            console.error(e)
            if (e.response && e.response.status === 403) {
                alert("🔒 FUNCIÓN PREMIUM\n\nContacta a tobias.alguibay@gmail.com para acceso.")
            }
            return []
        }
    }, [fuentes, session]) // Dependencia importante: fuentes y session


    return {
        fuentes,
        noticias,
        cargandoNoticias,
        estadoFuentes,
        agregarFuente,
        borrarFuente,
        cargarNoticiasAPI,
        recomendarFuentes, // Nuevo
        procesandoUrls
    }
}
