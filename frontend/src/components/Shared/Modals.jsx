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

export const ModalPostEditor = ({ isOpen, onClose, content, setContent, onCopy }) => {
    if (!isOpen) return null
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content terminal" onClick={e => e.stopPropagation()}>
                <div className="terminal-header">
                    <h3 className="terminal-title">&gt; IA_GENERATOR.exe</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                </div>
                <textarea
                    className="terminal-textarea"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    spellCheck="false"
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button className="btn-terminal" onClick={onClose}>CANCELAR</button>
                    <button className="btn-terminal primary" onClick={onCopy}>COPIAR_TEXTO</button>
                </div>
            </div>
        </div>
    )
}

export const ModalBuscador = ({ isOpen, onClose, onBuscar, onAgregar }) => {
    const [tema, setTema] = useState('')
    const [resultados, setResultados] = useState([])
    const [buscando, setBuscando] = useState(false)

    // Limpiar al abrir
    useEffect(() => {
        if (isOpen) {
            setTema('')
            setResultados([])
            setBuscando(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleBuscar = async () => {
        if (!tema) return
        setBuscando(true)
        setResultados([])
        const res = await onBuscar(tema)
        setResultados(res)
        setBuscando(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '500px' }}>
                <h3 className="modal-title">EXPLORAR FUENTES</h3>
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '-10px', marginBottom: '20px' }}>
                    Teclea un tema y te recomendaré fuentes RSS.
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        className="modal-input"
                        autoFocus
                        type="text"
                        placeholder="Ej: Startups, Cine, NBA..."
                        value={tema}
                        onChange={e => setTema(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                        style={{ marginBottom: 0 }}
                    />
                    <button
                        className="btn-card primary"
                        onClick={handleBuscar}
                        disabled={buscando}
                        style={{ minWidth: '100px' }}
                    >
                        {buscando ? '...' : 'BUSCAR'}
                    </button>
                </div>

                <div style={{ marginTop: '20px', maxHeight: '300px', overflowY: 'auto' }}>
                    {buscando && <div style={{ textAlign: 'center', margin: '20px', color: '#888' }}>⏳ Buscando y validando...</div>}

                    {!buscando && resultados.length === 0 && tema && !isOpen && (
                        // Controlar si buscó o no
                        null
                    )}

                    {resultados.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{r.titulo}</div>
                                <div style={{ fontSize: '0.75rem', color: '#999' }}>{r.url}</div>
                            </div>
                            <button
                                className="btn-card"
                                style={{ padding: '5px 10px', fontSize: '0.7rem' }}
                                onClick={() => onAgregar(r.url)}
                            >
                                +
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button className="btn-card" onClick={onClose} style={{ border: 'none', color: '#888' }}>CERRAR</button>
                </div>
            </div>
        </div>
    )
}
