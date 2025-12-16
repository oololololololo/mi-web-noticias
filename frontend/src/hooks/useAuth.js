import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useAuth() {
    const [session, setSession] = useState(null)
    const [username, setUsername] = useState(null)
    const [loadingInit, setLoadingInit] = useState(true)

    useEffect(() => {
        // 1. Obtener sesión inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session) obtenerPerfil(session.user.id)
            else setLoadingInit(false)
        })

        // 2. Escuchar cambios de autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            if (session) obtenerPerfil(session.user.id)
            else {
                setUsername(null)
                setLoadingInit(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const obtenerPerfil = async (userId) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', userId)
                .single()

            if (data?.username) setUsername(data.username)
        } catch (error) {
            console.error('Error al obtener perfil:', error)
        } finally {
            // Importante: Marcar carga como terminada incluso si hay error
            setLoadingInit(false)
        }
    }

    return {
        session,
        username,
        loadingInit,
        setSession, // Exportamos por si se necesita manipular manualmente (raro)
        setUsername // Exportamos para actualizar tras registro de nombre
    }
}
