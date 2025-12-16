import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useBoxes(session) {
    const [cajas, setCajas] = useState([])
    const [cajasVisibles, setCajasVisibles] = useState([])
    const [cajaEditando, setCajaEditando] = useState(null)

    // Cargar cajas al iniciar o cambiar de usuario
    useEffect(() => {
        if (session?.user) {
            fetchCajas()
        } else {
            setCajas([])
            setCajasVisibles([])
            setCajaEditando(null)
        }
    }, [session])

    const fetchCajas = async () => {
        const { data } = await supabase
            .from('boxes')
            .select('*')
            .order('created_at', { ascending: true })

        if (data) {
            setCajas(data)
            // Por defecto, hacer visible la primera caja si existe
            if (data.length > 0) {
                // Opcional: si quieres restaurar visibilidad previa, aquí iría esa lógica. 
                // Por ahora mantenemos la lógica original: toggleVisibilidad(data[0].id)
                // Pero toggleVisibilidad depende del estado previo, así que lo seteamos directo.
                setCajasVisibles([data[0].id])
            }
        }
    }

    const crearCaja = async (nombre, color) => {
        if (!session?.user) return

        const { data, error } = await supabase
            .from('boxes')
            .insert([{ user_id: session.user.id, name: nombre, color: color }])
            .select()

        if (!error && data) {
            const nuevaCaja = data[0]
            setCajas(prev => [...prev, nuevaCaja])
            setCajasVisibles(prev => [...prev, nuevaCaja.id])
            setCajaEditando(nuevaCaja)
        }
    }

    const actualizarCaja = async (id, nombre, color) => {
        const { error } = await supabase
            .from('boxes')
            .update({ name: nombre, color: color })
            .eq('id', id)

        if (!error) {
            setCajas(prev => prev.map(c => c.id === id ? { ...c, name: nombre, color: color } : c))

            if (cajaEditando?.id === id) {
                setCajaEditando(prev => ({ ...prev, name: nombre, color: color }))
            }
        }
    }

    const borrarCaja = async (id) => {
        // La confirmación debería hacerse en la UI, aquí ejecutamos.
        await supabase.from('boxes').delete().eq('id', id)

        setCajas(prev => prev.filter(c => c.id !== id))
        setCajasVisibles(prev => prev.filter(visId => visId !== id))

        if (cajaEditando?.id === id) {
            setCajaEditando(null)
        }
    }

    const toggleVisibilidad = useCallback((id) => {
        setCajasVisibles(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id)
            return [...prev, id]
        })
    }, [])

    return {
        cajas,
        cajasVisibles,
        cajaEditando,
        setCajaEditando,
        crearCaja,
        actualizarCaja,
        borrarCaja,
        toggleVisibilidad
    }
}
