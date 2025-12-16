import { ArrowRight, Search, RotateCw } from 'lucide-react'
import { useState } from 'react'
import Auth from './Auth'
import UsernameForm from './UsernameForm'
import './App.css'

// Hooks
import { useAuth } from './hooks/useAuth'
import { useBoxes } from './hooks/useBoxes'
import { useFeeds } from './hooks/useFeeds'
import { useAI } from './hooks/useAI'

// Components
import { Sidebar } from './components/Layout/Sidebar'
import { NewsGrid } from './components/News/NewsGrid'
import { ModalCaja, ModalPostEditor, ModalBuscador } from './components/Shared/Modals'

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
    recomendarFuentes // Nuevo
  } = useFeeds(cajas, cajasVisibles)

  const {
    mostrarModalPost,
    setMostrarModalPost,
    postContent,
    setPostContent,
    cargandoIA,
    generarPost
  } = useAI()

  // UI State local
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modalCrearOpen, setModalCrearOpen] = useState(false)
  const [modalEditarOpen, setModalEditarOpen] = useState(false)
  const [modalBuscadorOpen, setModalBuscadorOpen] = useState(false) // NUEVO
  const [inputUrl, setInputUrl] = useState('')

  // Handlers UI wrapper
  const handleCrearCaja = (nombre, color) => {
    crearCaja(nombre, color)
  }

  const handleActualizarCaja = (nombre, color) => {
    if (cajaEditando) {
      actualizarCaja(cajaEditando.id, nombre, color)
    }
  }

  const handleAbrirEdicion = () => {
    if (cajaEditando) setModalEditarOpen(true)
  }

  // Modificado para aceptar URL opcional (del buscador)
  const handleAgregarFuente = async (url = '') => {
    const urlFinal = url || inputUrl
    if (!urlFinal || !cajaEditando) return
    await agregarFuente(cajaEditando.id, urlFinal)
    if (!url) setInputUrl('') // Solo limpiar input si vino del input manual
    // No cerramos el buscador para permitir agregar varias de una vez
  }

  // RENDER
  if (loadingInit) return <div className="container modo-carga">CARGANDO...</div>
  if (!session) return <Auth />
  if (!username) return <UsernameForm session={session} onNombreGuardado={setUsername} />

  return (
    <div className="app-layout">

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
      />

      <ModalBuscador
        isOpen={modalBuscadorOpen}
        onClose={() => setModalBuscadorOpen(false)}
        onBuscar={recomendarFuentes}
        onAgregar={handleAgregarFuente}
      />

      {/* SIDEBAR */}
      <Sidebar
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
      />

      {/* CONTENIDO PRINCIPAL */}
      <main className={`main-content ${sidebarOpen ? 'expanded' : 'collapsed'}`}>
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

            <div style={{ marginTop: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {fuentes.filter(f => f.box_id === cajaEditando.id).map(f => {
                const status = estadoFuentes[f.url]
                return (
                  <div key={f.id} style={{ background: 'white', border: '1px solid #ddd', padding: '5px 10px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                    {status === 'ok' && <span title="Fuente activa" style={{ color: 'black', fontSize: '1rem' }}>✔</span>}
                    {status === 'error' && <span title="No se pudo leer" style={{ color: 'black', fontSize: '1rem' }}>✘</span>}

                    <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: status === 'error' ? '#999' : 'black' }}>
                      {f.url}
                    </span>
                    <button onClick={() => borrarFuente(f.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px' }}>×</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* GRID DE NOTICIAS */}
        <NewsGrid
          noticias={noticias}
          cargandoNoticias={cargandoNoticias}
          onGenerarPost={generarPost}
          cargandoIA={cargandoIA}
        />
      </main>
    </div>
  )
}

export default App