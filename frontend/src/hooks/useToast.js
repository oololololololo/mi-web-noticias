import { useState, useCallback } from 'react'

// Hook para manejar notificaciones toast
export function useToast() {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.random()
        const toast = { id, message, type }

        setToasts(prev => [...prev, toast])

        // Auto-remove después de duration
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)

        return id
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    // Helpers para tipos comunes
    const success = useCallback((msg) => addToast(msg, 'success'), [addToast])
    const error = useCallback((msg) => addToast(msg, 'error', 6000), [addToast])
    const warning = useCallback((msg) => addToast(msg, 'warning', 5000), [addToast])
    const info = useCallback((msg) => addToast(msg, 'info'), [addToast])

    return {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info
    }
}
