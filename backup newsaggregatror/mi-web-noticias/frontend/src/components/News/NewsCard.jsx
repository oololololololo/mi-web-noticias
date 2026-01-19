import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Twitter, Linkedin, MessageCircle, Link2 } from 'lucide-react'

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

// Componente de compartir
function ShareButton({ noticia }) {
    const [showMenu, setShowMenu] = useState(false)

    const shareUrl = noticia.link
    const shareText = noticia.titulo

    const shareOptions = [
        {
            name: 'Twitter/X',
            icon: Twitter,
            url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'LinkedIn',
            icon: Linkedin,
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
        },
        {
            name: 'WhatsApp',
            icon: MessageCircle,
            url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
        }
    ]

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl)
        setShowMenu(false)
    }

    return (
        <div className="share-container">
            <button
                className="btn-card share"
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Compartir noticia"
            >
                <Share2 size={14} />
            </button>

            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        className="share-menu"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {shareOptions.map(option => (
                            <a
                                key={option.name}
                                href={option.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="share-option"
                                onClick={() => setShowMenu(false)}
                            >
                                <option.icon size={16} />
                                {option.name}
                            </a>
                        ))}
                        <button className="share-option" onClick={copyToClipboard}>
                            <Link2 size={16} />
                            Copiar link
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Memoizado para evitar re-renders innecesarios cuando otras noticias cambian
export const NewsCard = React.memo(function NewsCard({ noticia, index, onGenerarPost, cargandoIA }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            // Delay máximo de 0.3s (antes: index * 0.05 = 2.5s con 50 noticias)
            transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
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
                <ShareButton noticia={noticia} />
            </div>
        </motion.div>
    )
})
