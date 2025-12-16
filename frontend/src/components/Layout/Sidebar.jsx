import React from 'react'
import { supabase } from '../../supabaseClient'
import { Eye, EyeOff, Trash2, Menu, X, Plus, LogOut } from 'lucide-react'

export function Sidebar({
    username,
    cajas,
    cajasVisibles,
    cajaEditando,
    setCajaEditando,
    toggleVisibilidad,
    borrarCaja,
    setModalCrearOpen,
    sidebarOpen,
    setSidebarOpen
}) {

    // Función wrapper para manejar el borrado con confirmación visual
    const handleBorrar = (e, id) => {
        e.stopPropagation() // Detener propagación para no seleccionar la caja
        if (window.confirm("¿Seguro que quieres eliminar esta colección?")) {
            borrarCaja(id)
        }
    }

    return (
        <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>

            <button
                className={`toggle-btn ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* HEADER REDISEÑADO CON EFECTO CARD */}
            <div className="sidebar-header-wrapper" style={{ padding: '20px 15px', borderBottom: '1px solid #333' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                    <div className="brand-logo" style={{ fontWeight: '900', fontSize: '1.2rem', letterSpacing: '-1px', color: '#fff' }}>
                        NEWS<span style={{ color: '#666' }}>AGG</span>.
                    </div>
                </div>

                {sidebarOpen && (
                    <div className="user-profile-card">
                        <div className="avatar-circle">
                            {username ? username[0].toUpperCase() : 'U'}
                        </div>
                        <div className="user-info">
                            <span className="welcome-label">Bienvenido,</span>
                            <span className="username-display">{username}</span>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: '20px 15px 10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#555', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    {sidebarOpen ? 'Tus Colecciones' : '...'}
                </span>
            </div>

            <ul className="boxes-list">
                {cajas.map(caja => {
                    const isVisible = cajasVisibles.includes(caja.id)
                    const isEditing = cajaEditando?.id === caja.id
                    return (
                        <li key={caja.id} className={`box-item ${isEditing ? 'editing' : ''}`} onClick={() => setCajaEditando(caja)}>
                            <div className="box-left">
                                <div className="color-indicator" style={{ background: caja.color, boxShadow: isVisible ? `0 0 10px ${caja.color}` : 'none' }}></div>
                                {sidebarOpen && <span className="box-name">{caja.name}</span>}
                            </div>

                            {sidebarOpen && (
                                <div className="box-actions">
                                    <button
                                        className={`action-icon ${isVisible ? 'visible' : 'hidden'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleVisibilidad(caja.id); }}
                                        title={isVisible ? "Ocultar" : "Mostrar"}
                                    >
                                        {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button
                                        className="action-icon delete"
                                        onClick={(e) => handleBorrar(e, caja.id)}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>

            <div style={{ marginTop: 'auto', padding: '20px' }}>
                <button className="btn-new-box full-width" onClick={() => setModalCrearOpen(true)}>
                    {sidebarOpen ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Plus size={16} /> NUEVA COLECCIÓN
                        </span>
                    ) : <Plus size={20} />}
                </button>
                {sidebarOpen && (
                    <button onClick={() => supabase.auth.signOut()} className="btn-logout-text">
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <LogOut size={14} /> CERRAR SESIÓN
                        </span>
                    </button>
                )}
            </div>
        </aside>
    )
}
