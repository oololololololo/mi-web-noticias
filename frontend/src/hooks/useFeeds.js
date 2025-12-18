import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import { supabase } from '../supabaseClient'

// 1 hora de validez por URL
const TIEMPO_CACHE = 60 * 60 * 1000
const CACHE_KEY_GRANULAR = 'noticias_url_cache_v2'

export function useFeeds(cajas, cajasVisibles) {
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

    // Procesa colores usando la info actual
    const procesarColores = useCallback((listaNoticias, fuentesActuales, cajasActuales) => {
        return listaNoticias.map(noticia => {
            const fuenteOrigen = fuentesActuales.find(f => f.url === noticia.url_origen)
            let colorCaja = '#000'
            if (fuenteOrigen) {
                const caja = cajasActuales.find(c => c.id === fuenteOrigen.box_id)
                if (caja) colorCaja = caja.color
            }
            return { ...noticia, color: colorCaja }
        })
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
        const nuevosEstados = {}

        // 2. Clasificar URLs (Hit vs Miss)
        urlsUnicas.forEach(url => {
            let hit = false
            if (!forzarRecarga && cacheGlobal[url]) {
                const entry = cacheGlobal[url]
                if (ahora - entry.timestamp < TIEMPO_CACHE) {
                    hit = true
                    noticiasListas.push(...entry.noticias)
                    nuevosEstados[url] = 'ok'
                }
            }
            if (!hit) {
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

        // 3. Renderizar INMEDIATAMENTE lo que tenemos en caché
        //    (Esto evita el parpadeo "tosco")
        const noticiasCacheSinDuplicados = deduplicarNoticias(noticiasListas)
        setNoticias(procesarColores(noticiasCacheSinDuplicados, fuentes, cajas))
        setEstadoFuentes(prev => ({ ...prev, ...nuevosEstados }))

        // 4. Si no falta nada, terminamos.
        if (urlsFaltantes.length === 0) {
            setCargandoNoticias(false)
            return
        }

        // 5. Buscar lo que falta (STREAMING)
        setCargandoNoticias(true)
        setProcesandoUrls(prev => new Set([...prev, ...urlsFaltantes]))

        const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

        // Usamos fetch nativo para soportar streaming (Axios es más complejo para esto)
        fetch(`${apiUrl}/stream-noticias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urlsFaltantes })
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

                            // Actualizar Cache Granular
                            const cacheAhora = JSON.parse(localStorage.getItem(CACHE_KEY_GRANULAR) || '{}')

                            if (status === 'error') {
                                nuevosEstados[url] = 'error'
                            } else {
                                nuevosEstados[url] = 'ok'
                                cacheAhora[url] = {
                                    timestamp: Date.now(),
                                    noticias: nuevasNoticias
                                }
                            }
                            localStorage.setItem(CACHE_KEY_GRANULAR, JSON.stringify(cacheAhora))

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
                    urlsFaltantes.forEach(u => next.delete(u))
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

            const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
            const res = await axios.post(`${apiUrl}/recomendar-fuentes`, {
                tema,
                urls_existentes: urlsActuales
            })
            return res.data.fuentes || []
        } catch (e) {
            console.error(e)
            return []
        }
    }, [fuentes]) // Dependencia importante: fuentes

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
