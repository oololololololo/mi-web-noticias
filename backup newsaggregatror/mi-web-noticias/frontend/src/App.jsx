import { ArrowRight, Search, RotateCw } from 'lucide-react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import Auth from './Auth'
import UsernameForm from './UsernameForm'
import './App.css'

// Hooks
import { useAuth } from './hooks/useAuth'
import { useBoxes } from './hooks/useBoxes'
import { useFeeds } from './hooks/useFeeds'
import { useAI } from './hooks/useAI'
import { useAIConfig } from './hooks/useAIConfig'
import { useToast } from './hooks/useToast'

// Components
import { Sidebar } from './components/Layout/Sidebar'
import { NewsGrid } from './components/News/NewsGrid'
import { ModalCaja, ModalPostEditor, ModalBuscador, ModalConfigIA } from './components/Shared/Modals'
import { LoadingPill } from './components/Shared/LoadingPill'
import { ToastContainer } from './components/Shared/ToastContainer'
import { NewsSearch } from './components/News/NewsSearch'

function App() {
  const { session, username, loadingInit, setUsername } = useAuth()

  const {
    cajas,
    cajasVisibles,
    cajaEditando,
    setCajaEditando,
    crearCaja,
    actualizarCaja,
    borrarCaja,
    toggleVisibilidad
  } = useBoxes(session)

  const {
    fuentes,
    noticias,
    cargandoNoticias,
    estadoFuentes,
    agregarFuente,
    borrarFuente,
    cargarNoticiasAPI,
    recomendarFuentes, // Nuevo
    procesandoUrls
  } = useFeeds(cajas, cajasVisibles, session)


  const { config, updateConfig } = useAIConfig()

  const {
    mostrarModalPost,
    setMostrarModalPost,
    postContent,
    setPostContent,
    cargandoIA,
    generarPost
  } = useAI(config, session)


  // UI State local
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modalCrearOpen, setModalCrearOpen] = useState(false)
  const [modalEditarOpen, setModalEditarOpen] = useState(false)
  const [modalBuscadorOpen, setModalBuscadorOpen] = useState(false)
  const [modalConfigOpen, setModalConfigOpen] = useState(false) // NUEVO
  const [inputUrl, setInputUrl] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('default') // 'default', 'fecha', 'fuente'

  // Toast notifications
  const { toasts, removeToast, warning } = useToast()

  // Notificar cuando hay fuentes con error
  useEffect(() => {
    const errores = Object.entries(estadoFuentes)
      .filter(([_, status]) => status === 'error')
      .map(([url]) => url)

    if (errores.length > 0 && !cargandoNoticias) {
      warning(`${errores.length} fuente(s) no pudieron cargarse`)
    }
  }, [estadoFuentes, cargandoNoticias])

  // Filtrar noticias por búsqueda
  const noticiasFiltradas = useMemo(() => {
    let resultado = noticias

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      resultado = resultado.filter(n =>
        n.titulo?.toLowerCase().includes(query) ||
        n.resumen?.toLowerCase().includes(query) ||
        n.fuente?.toLowerCase().includes(query)
      )
    }

    // Ordenar
    if (sortBy === 'fecha') {
      resultado = [...resultado].sort((a, b) => {
        const dateA = new Date(a.fecha || 0)
        const dateB = new Date(b.fecha || 0)
        return dateB - dateA // Más recientes primero
      })
    } else if (sortBy === 'fuente') {
      resultado = [...resultado].sort((a, b) =>
        (a.fuente || '').localeCompare(b.fuente || '')
      )
    }

    return resultado
  }, [noticias, searchQuery, sortBy])

  // Handlers UI wrapper - memoizados para evitar re-renders de hijos
  const handleCrearCaja = useCallback((nombre, color) => {
    crearCaja(nombre, color)
  }, [crearCaja])

  const handleActualizarCaja = useCallback((nombre, color) => {
    if (cajaEditando) {
      actualizarCaja(cajaEditando.id, nombre, color)
    }
  }, [cajaEditando, actualizarCaja])

  const handleAbrirEdicion = () => {
    if (cajaEditando) setModalEditarOpen(true)
  }

  // Modificado para aceptar URL opcional (del buscador)
  const handleAgregarFuente = useCallback(async (url = '') => {
    const urlFinal = url || inputUrl
    if (!urlFinal || !cajaEditando) return
    await agregarFuente(cajaEditando.id, urlFinal)
    if (!url) setInputUrl('') // Solo limpiar input si vino del input manual
    // No cerramos el buscador para permitir agregar varias de una vez
  }, [inputUrl, cajaEditando, agregarFuente])

  // RENDER
  if (loadingInit) return <div className="container modo-carga">CARGANDO...</div>
  if (!session) return <Auth />
  if (!username) return <UsernameForm session={session} onNombreGuardado={setUsername} />

  return (
    <>
      {/* Skip links para navegación por teclado */}
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      <a href="#sidebar-nav" className="skip-link">
        Saltar a navegación
      </a>

      <div className="app-layout" lang="es">

        {/* MODALES */}
        <ModalCaja
          isOpen={modalCrearOpen}
          onClose={() => setModalCrearOpen(false)}
          onConfirm={handleCrearCaja}
          tituloModal="NUEVA CAJA"
        />

        <ModalCaja
          isOpen={modalEditarOpen}
          onClose={() => setModalEditarOpen(false)}
          onConfirm={handleActualizarCaja}
          tituloModal="EDITAR CAJA"
          initialName={cajaEditando?.name}
          initialColor={cajaEditando?.color}
        />

        <ModalPostEditor
          isOpen={mostrarModalPost}
          onClose={() => setMostrarModalPost(false)}
          content={postContent}
          setContent={setPostContent}
          onCopy={() => navigator.clipboard.writeText(postContent)}
          onOpenConfig={() => setModalConfigOpen(true)} // NUEVO: Acceso directo a config desde el modal
        />

        <ModalBuscador
          isOpen={modalBuscadorOpen}
          onClose={() => setModalBuscadorOpen(false)}
          onBuscar={recomendarFuentes}
          onAgregar={handleAgregarFuente}
        />

        <ModalConfigIA
          isOpen={modalConfigOpen}
          onClose={() => setModalConfigOpen(false)}
          config={config}
          updateConfig={updateConfig}
        />

        <LoadingPill urls={Array.from(procesandoUrls)} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* SIDEBAR */}
        <Sidebar
          id="sidebar-nav"
          username={username}
          cajas={cajas}
          cajasVisibles={cajasVisibles}
          cajaEditando={cajaEditando}
          setCajaEditando={setCajaEditando}
          toggleVisibilidad={toggleVisibilidad}
          borrarCaja={borrarCaja}
          setModalCrearOpen={setModalCrearOpen}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onOpenConfig={() => setModalConfigOpen(true)} // NUEVO
        />

        {/* CONTENIDO PRINCIPAL */}
        <main
          id="main-content"
          className="main-content"
          style={{ paddingLeft: sidebarOpen ? '280px' : '0' }}
          aria-label="Noticias del agregador"
        >
          <div className="content-header">
            <div className="box-title-container">
              <h2 className="box-title" style={{ color: cajaEditando ? cajaEditando.color : 'black' }}>
                {cajaEditando ? cajaEditando.name : 'Mi Feed'}
              </h2>

              {cajaEditando && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn-edit-box"
                    disabled={cargandoNoticias}
                    style={{ opacity: cargandoNoticias ? 0.7 : 1, cursor: cargandoNoticias ? 'wait' : 'pointer' }}
                    onClick={() => {
                      const urlsActuales = fuentes.filter(f => f.box_id === cajaEditando.id).map(f => f.url)
                      cargarNoticiasAPI(urlsActuales, true)
                    }}
                    title="Buscar noticias nuevas ahora"
                  >
                    <span className={cargandoNoticias ? 'rotating' : ''} style={{ display: 'inline-block', marginRight: '5px' }}>
                      ↻
                    </span>
                    {cargandoNoticias ? 'CARGANDO...' : 'REFRESCAR'}
                  </button>
                  <button className="btn-edit-box" onClick={handleAbrirEdicion}>
                    EDITAR ✎
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PANEL DE FUENTES (Solo si hay caja seleccionada) */}
          {cajaEditando && (
            <div className="sources-panel">
              <div className="input-group">
                <input
                  className="input-url"
                  type="text"
                  placeholder="Pega URL... o busca ->"
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAgregarFuente()}
                />
                <button
                  className="btn-add"
                  onClick={() => handleAgregarFuente()}
                  style={{ marginRight: '5px' }}
                >
                  AÑADIR
                </button>
                <button
                  className="btn-add"
                  onClick={() => setModalBuscadorOpen(true)}
                  title="Buscar fuentes nuevas"
                  style={{ backgroundColor: '#444' }}
                >
                  <Search size={18} />
                </button>
              </div>

              <div className="flex flex-wrap gap-md mt-md">
                {fuentes.filter(f => f.box_id === cajaEditando.id).map(f => {
                  const status = estadoFuentes[f.url]
                  return (
                    <div key={f.id} className="source-chip">
                      {status === 'ok' && <span title="Fuente activa" className="status-icon">✔</span>}
                      {status === 'error' && <span title="No se pudo leer" className="status-icon">✘</span>}

                      <span className={`text-ellipsis ${status === 'error' ? 'source-chip--error' : ''}`}>
                        {f.url}
                      </span>
                      <button
                        onClick={() => borrarFuente(f.id)}
                        className="source-chip__delete"
                        title="Eliminar fuente"
                      >×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* BÚSQUEDA Y ORDENAMIENTO */}
          {noticias.length > 0 && (
            <div style={{ padding: '0 20px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <NewsSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder={`Buscar en ${noticias.length} noticias...`}
                  />
                </div>
                <div className="sort-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ordenar:</span>
                  <button
                    className={`sort-btn ${sortBy === 'default' ? 'active' : ''}`}
                    onClick={() => setSortBy('default')}
                  >
                    Por defecto
                  </button>
                  <button
                    className={`sort-btn ${sortBy === 'fecha' ? 'active' : ''}`}
                    onClick={() => setSortBy('fecha')}
                  >
                    Más recientes
                  </button>
                  <button
                    className={`sort-btn ${sortBy === 'fuente' ? 'active' : ''}`}
                    onClick={() => setSortBy('fuente')}
                  >
                    Por fuente
                  </button>
                </div>
              </div>
              {searchQuery && (
                <p style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', marginTop: '-5px', marginBottom: '15px' }}>
                  {noticiasFiltradas.length} resultado(s) encontrado(s)
                </p>
              )}
            </div>
          )}

          {/* GRID DE NOTICIAS */}
          <NewsGrid
            noticias={noticiasFiltradas}
            cargandoNoticias={cargandoNoticias}
            onGenerarPost={generarPost}
            cargandoIA={cargandoIA}
          />
        </main>
      </div>
    </>
  )
}

export default App