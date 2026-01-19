import React, { useState, useEffect } from 'react'

const COLORES_MATE = [
    '#333333', '#2E5E4E', '#8B3A3A', '#3B4E78', '#8B6508', '#5D478B', '#A0522D'
]

export const ModalCaja = ({ isOpen, onClose, onConfirm, tituloModal, initialName = '', initialColor = '' }) => {
    const defaultColor = COLORES_MATE[0]
    const [nombre, setNombre] = useState('')
    const [color, setColor] = useState(defaultColor)

    useEffect(() => {
        if (isOpen) {
            setNombre(initialName || '')
            setColor(initialColor || defaultColor)
        }
    }, [isOpen, initialName, initialColor])

    if (!isOpen) return null

    const handleSubmit = () => {
        if (!nombre.trim()) return
        // Si estamos editando, pasamos (id, nombre, color), pero el modal es genérico
        // El padre manejará la lógica exacta.
        onConfirm(nombre, color)
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">{tituloModal}</h3>

                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px', textAlign: 'left' }}>NOMBRE</label>
                <input
                    className="modal-input"
                    autoFocus
                    type="text"
                    placeholder="Ej: Tecnología, Comida..."
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />

                <p style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '10px', marginTop: '20px', textAlign: 'center' }}>COLOR ACTUAL</p>
                <div className="color-palette">
                    {COLORES_MATE.map(c => {
                        const isSelected = color && c.toUpperCase() === color.toUpperCase()
                        return (
                            <div
                                key={c}
                                className={`color-option ${isSelected ? 'selected' : ''}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                            />
                        )
                    })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px' }}>
                    <button className="btn-card" onClick={onClose} style={{ border: 'none' }}>CANCELAR</button>
                    <button className="btn-card primary" onClick={handleSubmit}>
                        {tituloModal === 'NUEVA CAJA' ? 'CREAR' : 'GUARDAR CAMBIOS'}
                    </button>
                </div>
            </div>
        </div>
    )
}

import { RotateCw, Sparkles, Copy, X, Settings, Globe, Search, Plus as PlusIcon } from 'lucide-react'

export const ModalPostEditor = ({ isOpen, onClose, content, setContent, onCopy, onOpenConfig }) => {
    if (!isOpen) return null

    const handleCopy = () => {
        onCopy()
        // Opcional: Feedback visual o cerrar
        onClose()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content ai-modal" onClick={e => e.stopPropagation()}>
                <div className="ai-modal-header">
                    <div className="ai-title-wrapper">
                        <Sparkles className="ai-icon-pulse" size={24} />
                        <h3 className="ai-modal-title">AI Assistant</h3>
                    </div>
                    <button onClick={onClose} className="btn-close-clean">
                        <X size={20} />
                    </button>
                </div>

                <div className="ai-body">
                    <p className="ai-subtitle">Aquí tienes tu borrador sugerido para redes sociales:</p>
                    <textarea
                        className="ai-textarea"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        spellCheck="false"
                        placeholder="Generando contenido..."
                    />
                </div>

                <div className="ai-footer">
                    <button className="btn-ai-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn-ai-primary" onClick={handleCopy}>
                        <Copy size={16} /> Copiar Texto
                    </button>
                    <div style={{ flex: 1 }}></div> {/* Spacer */}
                    <button
                        className="btn-ai-secondary"
                        onClick={onOpenConfig}
                        title="Configurar Estilo/Idioma"
                        style={{ padding: '8px 12px' }}
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export const ModalConfigIA = ({ isOpen, onClose, config, updateConfig }) => {
    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content ai-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className="ai-modal-header">
                    <h3 className="ai-modal-title">Configuración IA</h3>
                    <button onClick={onClose} className="btn-close-clean">
                        <X size={20} />
                    </button>
                </div>

                <div className="ai-body">
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>Idioma</label>
                        <select
                            className="modern-input"
                            value={config.idioma}
                            onChange={e => updateConfig('idioma', e.target.value)}
                        >
                            <option value="Español">Español</option>
                            <option value="Inglés">Inglés</option>
                            <option value="Portugués">Portugués</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>Estilo</label>
                        <select
                            className="modern-input"
                            value={config.estilo}
                            onChange={e => updateConfig('estilo', e.target.value)}
                        >
                            <option value="Formal">Formal</option>
                            <option value="Casual">Casual</option>
                            <option value="Clickbait">Viral / Clickbait</option>
                            <option value="Profesional">Profesional</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#888', marginBottom: '8px', fontSize: '0.9rem' }}>Longitud</label>
                        <select
                            className="modern-input"
                            value={config.longitud}
                            onChange={e => updateConfig('longitud', e.target.value)}
                        >
                            <option value="Corto">Corto (Tweet)</option>
                            <option value="Medio">Medio (Post)</option>
                            <option value="Largo">Largo (Artículo)</option>
                        </select>
                    </div>
                </div>

                <div className="ai-footer">
                    <button className="btn-ai-primary" style={{ width: '100%' }} onClick={onClose}>
                        Guardar Preferencias
                    </button>
                </div>
            </div>
        </div>
    )
}

export const ModalBuscador = ({ isOpen, onClose, onBuscar, onAgregar }) => {
    const [tema, setTema] = useState('')
    const [resultados, setResultados] = useState([])
    const [buscando, setBuscando] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)

    // Limpiar al abrir
    useEffect(() => {
        if (isOpen) {
            setTema('')
            setResultados([])
            setBuscando(false)
            setHasSearched(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleBuscar = async () => {
        if (!tema) return
        setBuscando(true)
        setResultados([])
        setHasSearched(false)
        const res = await onBuscar(tema)
        setResultados(res)
        setBuscando(false)
        setHasSearched(true)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            {/* Usamos el estilo AI Modal para consistencia */}
            <div className="modal-content ai-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>

                <div className="ai-modal-header">
                    <div className="ai-title-wrapper">
                        <Globe className="ai-icon-pulse" size={24} />
                        <h3 className="ai-modal-title">Explorar Fuentes</h3>
                    </div>
                    <button onClick={onClose} className="btn-close-clean">
                        <X size={20} />
                    </button>
                </div>

                <div className="ai-body">
                    <p style={{ fontSize: '0.95rem', color: '#aaa', marginTop: '0', marginBottom: '20px', lineHeight: '1.5' }}>
                        Teclea un tema (ej: "Tecnología", "Cocina", "Cripto") y la IA encontrará las mejores fuentes RSS verificadas.
                    </p>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '25px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                            <input
                                className="modern-input"
                                autoFocus
                                type="text"
                                placeholder="Tema de interés..."
                                value={tema}
                                onChange={e => setTema(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                                style={{ paddingLeft: '40px', marginBottom: 0, width: '100%' }}
                            />
                        </div>
                        <button
                            className="btn-ai-primary"
                            onClick={handleBuscar}
                            disabled={buscando}
                            style={{ minWidth: '120px', height: '42px' }} // Altura fija para alinearse con input
                        >
                            {buscando ? <RotateCw className="rotating" size={18} /> : 'BUSCAR'}
                        </button>
                    </div>

                    <div style={{ marginTop: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                        {buscando && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                                <Sparkles className="ai-icon-pulse" size={32} style={{ marginBottom: '15px' }} />
                                <p>Analizando la web en busca de feeds...</p>
                            </div>
                        )}

                        {!buscando && hasSearched && resultados.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '30px', color: '#666', border: '1px dashed #444', borderRadius: '12px' }}>
                                No se encontraron fuentes para "{tema}". Intenta algo más general.
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {resultados.map((res, i) => (
                                <div key={i} className="ai-search-result-card" style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    transition: 'background 0.2s'
                                }}>
                                    <div style={{ overflow: 'hidden', marginRight: '15px' }}>
                                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {res.titulo || res.url}
                                        </div>
                                        <div style={{ color: '#888', fontSize: '0.8rem', whiteWhiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {res.url}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onAgregar(res.url)}
                                        className="btn-icon-add"
                                        title="Añadir fuente"
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                            color: '#fff',
                                            borderRadius: '50%',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.borderColor = '#a8dadc'
                                            e.currentTarget.style.color = '#a8dadc'
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                                            e.currentTarget.style.color = '#fff'
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

