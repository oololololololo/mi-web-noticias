import { useState, useCallback } from 'react'
import axios from 'axios'
export function useAI(config, session) {
    const [mostrarModalPost, setMostrarModalPost] = useState(false)
    const [postContent, setPostContent] = useState('')
    const [cargandoIA, setCargandoIA] = useState(false)

    // No usamos useAIConfig aquí dentro para evitar estados desincronizados.
    // La config viene "propagada" desde App.jsx que es quien tiene el estado "vivo".

    const generarPost = useCallback((noticia) => {
        if (!session?.access_token) {
            setPostContent("Error: No hay sesión activa.")
            setMostrarModalPost(true)
            return
        }

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

        const apiUrl = import.meta.env.VITE_BACKEND_URL || 'https://mi-ap-noticias.onrender.com'

        axios.post(`${apiUrl}/generar-post`, payload, {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        })
            .then(res => {
                setPostContent(res.data.contenido)
                setMostrarModalPost(true)
                setCargandoIA(false)
            })
            .catch((err) => {
                console.error(err)
                setCargandoIA(false)
                if (err.response && err.response.status === 403) {
                    setPostContent("🔒 FUNCIÓN PREMIUM\n\nEsta función es exclusiva para usuarios verificados.\n\nPara solicitar acceso, contacta al administrador:\ntobias.alguibay@gmail.com")
                    setMostrarModalPost(true)
                } else {
                    setPostContent(`Error inesperado: ${err.message}`)
                    setMostrarModalPost(true)
                }
            })
    }, [config, session])

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
