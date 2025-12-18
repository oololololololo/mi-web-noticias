import { useState, useCallback } from 'react'
import axios from 'axios'
export function useAI(config) {
    const [mostrarModalPost, setMostrarModalPost] = useState(false)
    const [postContent, setPostContent] = useState('')
    const [cargandoIA, setCargandoIA] = useState(false)

    // No usamos useAIConfig aquí dentro para evitar estados desincronizados.
    // La config viene "propagada" desde App.jsx que es quien tiene el estado "vivo".

    const generarPost = useCallback((noticia) => {
        setCargandoIA(true)

        // Usamos la config que nos pasan o valores por defecto por seguridad
        const payload = {
            titulo: noticia.titulo,
            resumen: noticia.resumen,
            fuente: noticia.fuente,
            idioma: config?.idioma || 'Español',
            estilo: config?.estilo || 'Formal',
            longitud: config?.longitud || 'Medio'
        }

        console.log("Generando post con config:", payload) // Debug log

        axios.post('http://127.0.0.1:8000/generar-post', payload)
            .then(res => {
                setPostContent(res.data.contenido)
                setMostrarModalPost(true)
                setCargandoIA(false)
            })
            .catch((err) => {
                console.error(err)
                setCargandoIA(false)
            })
    }, [config])

    return {
        mostrarModalPost,
        setMostrarModalPost,
        postContent,
        setPostContent,
        cargandoIA,
        generarPost,
        config // Exportamos para que UI pueda saber qué se usó si quiere
    }
}
