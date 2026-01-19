import React from 'react'
import { motion } from 'framer-motion'

export const SkeletonCard = () => (
    <div className="news-card skeleton-card">
        <div className="skeleton-pulse" style={{ width: '80px', height: '20px', marginBottom: '15px' }}></div>
        <div className="skeleton-pulse" style={{ width: '90%', height: '28px', marginBottom: '10px' }}></div>
        <div className="skeleton-pulse" style={{ width: '60%', height: '28px', marginBottom: '20px' }}></div>
        <div className="skeleton-pulse" style={{ width: '100%', height: '15px', marginBottom: '8px' }}></div>
        <div className="skeleton-pulse" style={{ width: '100%', height: '15px', marginBottom: '8px' }}></div>
        <div className="skeleton-pulse" style={{ width: '80%', height: '15px', marginBottom: '25px' }}></div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <div className="skeleton-pulse" style={{ width: '80px', height: '40px' }}></div>
            <div className="skeleton-pulse" style={{ width: '100px', height: '40px' }}></div>
        </div>
    </div>
)

export function NewsCard({ noticia, index, onGenerarPost, cargandoIA }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="news-card"
            style={{
                borderColor: noticia.color || 'black',
            }}
        >
            <div>
                <span className="news-source-tag" style={{ backgroundColor: noticia.color || 'black' }}>{noticia.fuente}</span>
                <h3 className="news-title">{noticia.titulo}</h3>
                <div className="news-summary">{noticia.resumen}</div>
            </div>
            <div className="actions">
                <a href={noticia.link} target="_blank" rel="noopener noreferrer" className="btn-card">LEER</a>
                <button onClick={() => onGenerarPost(noticia)} disabled={cargandoIA} className="btn-card primary">
                    {cargandoIA ? 'PENSANDO...' : 'IA POST'}
                </button>
            </div>
        </motion.div>
    )
}
