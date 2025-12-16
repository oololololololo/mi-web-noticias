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

        // 5. Buscar lo que falta
        setCargandoNoticias(true) // Indicador de carga (puede ser discreto si ya hay noticias)

        const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'
        axios.post(`${apiUrl}/obtener-noticias`, { urls: urlsFaltantes })
            .then(res => {
                // Actualizar caché con lo nuevo
                const cacheActualizado = { ...cacheGlobal } // copia fresca

                // Agrupar noticias nuevas por URL para guardarlas granularmente
                const noticiasPorUrl = {}
                if (res.data.noticias) {
                    res.data.noticias.forEach(n => {
                        if (!noticiasPorUrl[n.url_origen]) noticiasPorUrl[n.url_origen] = []
                        noticiasPorUrl[n.url_origen].push(n)
                    })
                }

                // Guardar éxitos
                urlsFaltantes.forEach(url => {
                    // Si la URL devolvió noticias o al menos no falló explícitamente y no trajo nada (vacío)
                    // Asumimos que "vacío" es un resultado válido para cachear también, para no reintentar infinitamente
                    const misNoticias = noticiasPorUrl[url] || []

                    // Si está en la lista de fallos del backend, NO guardamos caché (o guardamos estado error)
                    if (res.data.fallos && res.data.fallos.includes(url)) {
                        nuevosEstados[url] = 'error'
                        // No actualizamos timestamp para reintentar luego? O cacheamos el error?
                        // Mejor no cachear error para reintentar al refrescar.
                    } else {
                        nuevosEstados[url] = 'ok'
                        cacheActualizado[url] = {
                            timestamp: ahora,
                            noticias: misNoticias
                        }
                        // Añadir a la lista visual
                        noticiasListas.push(...misNoticias)
                    }
                })

                // Persistir
                localStorage.setItem(CACHE_KEY_GRANULAR, JSON.stringify(cacheActualizado))

                // Actualizar UI final
                setEstadoFuentes(prev => ({ ...prev, ...nuevosEstados }))
                setNoticias(procesarColores(noticiasListas, fuentes, cajas))
                setCargandoNoticias(false)
            })
            .catch(err => {
                console.error(err)
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
