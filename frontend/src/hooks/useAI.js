import { useState, useCallback } from 'react'
import axios from 'axios'

export function useAI() {
    const [mostrarModalPost, setMostrarModalPost] = useState(false)
    const [postContent, setPostContent] = useState('')
    const [cargandoIA, setCargandoIA] = useState(false)

    const generarPost = useCallback((noticia) => {
        setCargandoIA(true)
        axios.post('http://127.0.0.1:8000/generar-post', {
            titulo: noticia.titulo,
            resumen: noticia.resumen,
            fuente: noticia.fuente
        })
            .then(res => {
                setPostContent(res.data.contenido)
                setMostrarModalPost(true)
                setCargandoIA(false)
            })
            .catch((err) => {
                console.error(err)
                setCargandoIA(false)
            })
    }, [])

    return {
        mostrarModalPost,
        setMostrarModalPost,
        postContent,
        setPostContent,
        cargandoIA,
        generarPost
    }
}
