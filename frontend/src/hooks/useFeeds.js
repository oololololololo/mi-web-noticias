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
        if (urlsObjetivo.length === 0) {
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
        urlsObjetivo.forEach(url => {
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

        // 3. Renderizar INMEDIATAMENTE lo que tenemos en caché
        //    (Esto evita el parpadeo "tosco")
        setNoticias(procesarColores(noticiasListas, fuentes, cajas))
        setEstadoFuentes(prev => ({ ...prev, ...nuevosEstados }))

        // 4. Si no falta nada, terminamos.
        if (urlsFaltantes.length === 0) {
            setCargandoNoticias(false)
            return
        }

        // 5. Buscar lo que falta (¡Ahora con carga progresiva!)
        setCargandoNoticias(true)

        // Creamos una promesa por cada URL faltante para que se carguen independientemente
        const promesas = urlsFaltantes.map(url => {
            const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

            return axios.post(`${apiUrl}/obtener-noticias`, { urls: [url] })
                .then(res => {
                    const nuevasNoticias = res.data.noticias || []
                    const fallos = res.data.fallos || []

                    // 1. Actualizar Cache Granular
                    const cacheAhora = JSON.parse(localStorage.getItem(CACHE_KEY_GRANULAR) || '{}')

                    if (fallos.includes(url)) {
                        nuevosEstados[url] = 'error'
                    } else {
                        nuevosEstados[url] = 'ok'
                        // Guardamos aunque venga vacío para no reintentar
                        cacheAhora[url] = {
                            timestamp: Date.now(), // timestamp fresco
                            noticias: nuevasNoticias
                        }
                    }
                    localStorage.setItem(CACHE_KEY_GRANULAR, JSON.stringify(cacheAhora))

                    // 2. Actualizar ESTADO VISUAL (Progresivo)
                    // Usamos functional update para no perder lo que haya llegado de otras peticiones
                    if (nuevasNoticias.length > 0) {
                        setNoticias(prev => {
                            // Combinar y filtrar duplicados por si acaso (aunque url_origen debería separar)
                            const combinadas = [...prev, ...nuevasNoticias]
                            return procesarColores(combinadas, fuentes, cajas) // Re-aplicar colores
                        })
                    }

                    setEstadoFuentes(prev => ({ ...prev, [url]: fallos.includes(url) ? 'error' : 'ok' }))
                })
                .catch(err => {
                    console.error(`Error cargando ${url}`, err)
                    setEstadoFuentes(prev => ({ ...prev, [url]: 'error' }))
                })
        })

        // Cuando TODAS terminen (éxito o error), apagamos el loading general
        Promise.allSettled(promesas).then(() => {
            setCargandoNoticias(false)
        })

    }, [cajas, fuentes, procesarColores])

    // Efecto: Cuando cambia la selección de cajas
    useEffect(() => {
        if (fuentes.length > 0) {
            const urlsActivas = fuentes
                .filter(f => cajasVisibles.includes(f.box_id))
                .map(f => f.url)

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
        recomendarFuentes // Nuevo
    }
}
