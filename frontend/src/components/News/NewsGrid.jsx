import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { NewsCard, SkeletonCard } from './NewsCard'

export function NewsGrid({ noticias, cargandoNoticias, onGenerarPost, cargandoIA }) {
    // Mostrar Skeleton SÓLO si está cargando Y no hay noticias previas.
    // Si ya hay noticias y estamos actualizando, mantenemos las viejas (evita parpadeo).
    const showSkeletons = cargandoNoticias && noticias.length === 0

    return (
        <div className="news-grid">
            <AnimatePresence mode="popLayout">
                {showSkeletons ? (
                    // Skeletons no necesitan animación de salida compleja, 
                    // pero podemos envolverlos en un div para que se desvanezcan juntos.
                    <div key="loader" style={{ display: 'contents' }}>
                        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    noticias.map((noticia, index) => {
                        // Usamos link + titulo como key única para que Framer distinga los ítems
                        // Si no hay link, fallback al index (menos ideal para animación)
                        const uniqueKey = noticia.link || `${noticia.titulo}-${index}`

                        return (
                            <NewsCard
                                key={uniqueKey}
                                noticia={noticia}
                                index={index}
                                onGenerarPost={onGenerarPost}
                                cargandoIA={cargandoIA}
                            />
                        )
                    })
                )}
            </AnimatePresence>

            {!cargandoNoticias && noticias.length === 0 && (
                <div style={{ textAlign: 'center', gridColumn: '1/-1', color: '#999', marginTop: '50px' }}>
                    <p style={{ fontFamily: 'Merriweather', fontSize: '1.2rem' }}>Todo tranquilo por aquí.</p>
                    <p>Activa el ojo 👁️ de una caja para leer.</p>
                </div>
            )}
        </div>
    )
}
