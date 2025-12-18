import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCw } from 'lucide-react'

export function LoadingPill({ urls }) {
    const [currentUrl, setCurrentUrl] = useState('')

    // Efecto para rotar las URLs si hay muchas, o mostrar la última
    useEffect(() => {
        if (urls.length === 0) return

        // Simplemente mostramos la primera de la lista pendiente para que el usuario vea progreso
        // O podríamos rotarlas cada X ms si quisiéramos ser fancy.
        // Para simplificar y que se vea rápido: mostramos la primera.
        const url = urls[0]
        try {
            const domain = new URL(url).hostname.replace('www.', '')
            setCurrentUrl(domain)
        } catch {
            setCurrentUrl(url)
        }
    }, [urls])

    return (
        <AnimatePresence>
            {urls.length > 0 && (
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        background: '#222',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '30px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        zIndex: 1000,
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        border: '1px solid #444'
                    }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', transformOrigin: 'center' }}
                    >
                        <RotateCw size={16} />
                    </motion.div>
                    <span>
                        Consultando <b>{currentUrl}</b>...
                        {urls.length > 1 && <span style={{ opacity: 0.7, marginLeft: '5px' }}>(+{urls.length - 1})</span>}
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
