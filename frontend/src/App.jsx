import { useEffect, useState } from 'react'
import axios from 'axios'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import UsernameForm from './UsernameForm'
import './App.css'

// 1 hora en milisegundos (1000 ms * 60 seg * 60 min)
const TIEMPO_CACHE = 60 * 60 * 1000 
const CACHE_KEY = 'noticias_cache_v1'
// --- CONSTANTES ---
const COLORES_MATE = [
  '#333333', '#2E5E4E', '#8B3A3A', '#3B4E78', '#8B6508', '#5D478B', '#A0522D'
]

// --- COMPONENTE SKELETON ---
const SkeletonCard = () => (
  <div className="news-card skeleton-card">
    <div className="skeleton-pulse" style={{width: '80px', height: '20px', marginBottom: '15px'}}></div>
    <div className="skeleton-pulse" style={{width: '90%', height: '28px', marginBottom: '10px'}}></div>
    <div className="skeleton-pulse" style={{width: '60%', height: '28px', marginBottom: '20px'}}></div>
    <div className="skeleton-pulse" style={{width: '100%', height: '15px', marginBottom: '8px'}}></div>
    <div className="skeleton-pulse" style={{width: '100%', height: '15px', marginBottom: '8px'}}></div>
    <div className="skeleton-pulse" style={{width: '80%', height: '15px', marginBottom: '25px'}}></div>
    <div style={{display:'flex', gap:'10px'}}>
       <div className="skeleton-pulse" style={{width: '80px', height: '40px'}}></div>
       <div className="skeleton-pulse" style={{width: '100px', height: '40px'}}></div>
    </div>
  </div>
)

// --- MODALES ---
const ModalCaja = ({ isOpen, onClose, onConfirm, tituloModal, initialName='', initialColor='' }) => {
  // Nota: Si initialColor viene vacío, usamos el primer color de la lista por defecto
  const defaultColor = COLORES_MATE[0]
  
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState(defaultColor)

  // ESTE EFECTO ES LA CLAVE: 
  // Cada vez que se abre el modal (isOpen cambia), reiniciamos los valores
  // con lo que viene de la caja real (initialName e initialColor)
  useEffect(() => {
    if (isOpen) {
      setNombre(initialName || '')
      // Si hay un color inicial guardado, lo usamos. Si no, usamos el negro por defecto.
      setColor(initialColor || defaultColor)
    }
  }, [isOpen, initialName, initialColor])

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!nombre.trim()) return
    onConfirm(nombre, color)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{tituloModal}</h3>
        
        <label style={{display:'block', fontSize:'0.75rem', fontWeight:'bold', marginBottom:'5px', textAlign:'left'}}>NOMBRE</label>
        <input 
          className="modal-input" 
          autoFocus 
          type="text" 
          placeholder="Ej: Tecnología, Comida..." 
          value={nombre} 
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        
        <p style={{fontSize:'0.75rem', fontWeight:'bold', marginBottom:'10px', marginTop:'20px', textAlign:'center'}}>COLOR ACTUAL</p>
        <div className="color-palette">
          {COLORES_MATE.map(c => {
            // Comparación segura (ignora mayúsculas/minúsculas) para saber cuál está seleccionado
            const isSelected = color && c.toUpperCase() === color.toUpperCase()
            
            return (
              <div 
                key={c} 
                className={`color-option ${isSelected ? 'selected' : ''}`} 
                style={{backgroundColor: c}} 
                onClick={() => setColor(c)} 
              />
            )
          })}
        </div>

        <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'30px'}}>
          <button className="btn-card" onClick={onClose} style={{border:'none'}}>CANCELAR</button>
          <button className="btn-card primary" onClick={handleSubmit}>
            {tituloModal === 'NUEVA CAJA' ? 'CREAR' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ModalPostEditor = ({ onClose, content, setContent, onCopy }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content terminal" onClick={e => e.stopPropagation()}>
      <div className="terminal-header">
         <h3 className="terminal-title">&gt; IA_GENERATOR.exe</h3>
         <button onClick={onClose} style={{background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:'1.2rem'}}>×</button>
      </div>
      <textarea 
        className="terminal-textarea"
        value={content} 
        onChange={e => setContent(e.target.value)}
        spellCheck="false"
      />
      <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px'}}>
        <button className="btn-terminal" onClick={onClose}>CANCELAR</button>
        <button className="btn-terminal primary" onClick={onCopy}>COPIAR_TEXTO</button>
      </div>
    </div>
  </div>
)

// --- APP PRINCIPAL ---
function App() {
  const [session, setSession] = useState(null)
  const [username, setUsername] = useState(null)
  const [loadingInit, setLoadingInit] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Datos
  const [cajas, setCajas] = useState([])
  const [fuentes, setFuentes] = useState([])
  const [cajasVisibles, setCajasVisibles] = useState(new Set())
  const [cajaEditando, setCajaEditando] = useState(null) 
  
  // NUEVO: Estado para saber si una fuente funciona (ok) o falla (error)
  const [estadoFuentes, setEstadoFuentes] = useState({}) 

  // Noticias
  const [noticias, setNoticias] = useState([])
  const [cargandoNoticias, setCargandoNoticias] = useState(false)
  const [inputUrl, setInputUrl] = useState('')
  
  // UI & Modales
  const [modalCrearOpen, setModalCrearOpen] = useState(false)
  const [modalEditarOpen, setModalEditarOpen] = useState(false) 
  const [cajaParaEditar, setCajaParaEditar] = useState(null) 
  
  const [mostrarModalPost, setMostrarModalPost] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [cargandoIA, setCargandoIA] = useState(false)

  // 1. LOGIN & PERFIL
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) obtenerPerfil(session.user.id)
      else setLoadingInit(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) obtenerPerfil(session.user.id)
      else { setUsername(null); setLoadingInit(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const obtenerPerfil = async (userId) => {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single()
    if (data?.username) setUsername(data.username)
    await fetchCajas()
    setLoadingInit(false)
  }

  // 2. CAJAS
  const fetchCajas = async () => {
    const { data } = await supabase.from('boxes').select('*').order('created_at', { ascending: true })
    if (data) {
      setCajas(data)
      if (data.length > 0) toggleVisibilidad(data[0].id)
    }
  }

  const crearCaja = async (nombre, color) => {
    const { data, error } = await supabase.from('boxes').insert([{ user_id: session.user.id, name: nombre, color: color }]).select()
    if (!error) {
      setCajas([...cajas, data[0]])
      const newSet = new Set(cajasVisibles); newSet.add(data[0].id); setCajasVisibles(newSet)
      setCajaEditando(data[0])
      fetchFuentesTodas()
    }
  }

  const actualizarCaja = async (nombre, color) => {
    if (!cajaParaEditar) return
    const { error } = await supabase.from('boxes').update({ name: nombre, color: color }).eq('id', cajaParaEditar.id)
    if (!error) {
      const cajasActualizadas = cajas.map(c => c.id === cajaParaEditar.id ? { ...c, name: nombre, color: color } : c)
      setCajas(cajasActualizadas)
      if (cajaEditando?.id === cajaParaEditar.id) {
        setCajaEditando({ ...cajaEditando, name: nombre, color: color })
      }
    }
  }

  const abrirModalEdicion = (caja) => {
    setCajaParaEditar(caja)
    setModalEditarOpen(true)
  }

  const borrarCaja = async (e, id) => {
    e.stopPropagation()
    if (!confirm("¿Eliminar caja?")) return
    await supabase.from('boxes').delete().eq('id', id)
    setCajas(cajas.filter(c => c.id !== id))
    if (cajaEditando?.id === id) setCajaEditando(null)
    const newSet = new Set(cajasVisibles); newSet.delete(id); setCajasVisibles(newSet)
  }

  // 3. SELECCIÓN
  const toggleVisibilidad = (id) => {
    const newSet = new Set(cajasVisibles)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setCajasVisibles(newSet)
  }

  useEffect(() => { if (cajas.length > 0) fetchFuentesTodas() }, [cajasVisibles, cajas])

  // 4. FUENTES Y NOTICIAS
  const fetchFuentesTodas = async () => {
    const { data } = await supabase.from('sources').select('*')
    if (data) {
      setFuentes(data)
      const urlsActivas = data.filter(f => cajasVisibles.has(f.box_id)).map(f => f.url)
      if (urlsActivas.length > 0) cargarNoticiasAPI(urlsActivas)
      else setNoticias([])
    }
  }

  const agregarFuente = async () => {
    if (!inputUrl || !cajaEditando) return
    const { error } = await supabase.from('sources').insert([{ box_id: cajaEditando.id, url: inputUrl }])
    if (!error) { setInputUrl(''); fetchFuentesTodas() }
  }

  const borrarFuente = async (id) => {
    await supabase.from('sources').delete().eq('id', id)
    fetchFuentesTodas()
  }

  const cargarNoticiasAPI = (urls, forzarRecarga = false) => {
    if (urls.length === 0) {
      setNoticias([])
      return
    }

    // 1. GENERAR IDENTIFICADOR ÚNICO DE ESTA BÚSQUEDA
    // (Si cambias las URLs, la clave cambia y fuerza recarga)
    const requestKey = JSON.stringify(urls.sort())
    
    // 2. REVISAR CACHÉ (Si no estamos forzando recarga)
    if (!forzarRecarga) {
      const cacheGuardado = localStorage.getItem(CACHE_KEY)
      if (cacheGuardado) {
        const cache = JSON.parse(cacheGuardado)
        const ahora = Date.now()

        // ¿Es la misma lista de URLs? Y ¿Ha pasado menos de 1 hora?
        if (cache.requestKey === requestKey && (ahora - cache.timestamp < TIEMPO_CACHE)) {
          console.log("⚡ Usando noticias desde caché (Sin gastar API)")
          
          // Restauramos noticias y estados visuales
          setNoticias(procesarColores(cache.datos.noticias))
          setEstadoFuentes(prev => ({...prev, ...cache.datos.estados}))
          setCargandoNoticias(false)
          return // ¡TERMINAMOS AQUÍ! NO LLAMAMOS AL BACKEND
        }
      }
    }

    // 3. SI NO HAY CACHÉ O EXPIRÓ -> LLAMAMOS A LA API
    setCargandoNoticias(true)
    
    // RECUERDA: Cambiar URL a producción (https://mi-ap-noticias.onrender.com...)
    axios.post('https://mi-ap-noticias.onrender.com/obtener-noticias', { urls }) 
      .then(res => {
        // A. Procesar estados (Ticks y Cruces)
        const nuevosEstados = {}
        if (res.data.fallos) res.data.fallos.forEach(u => nuevosEstados[u] = 'error')
        if (res.data.noticias) res.data.noticias.forEach(n => {
           if(n.url_origen) nuevosEstados[n.url_origen] = 'ok'
        })

        // B. Guardar en Caché para la próxima
        const datosParaGuardar = {
          timestamp: Date.now(),
          requestKey: requestKey,
          datos: {
            noticias: res.data.noticias,
            estados: nuevosEstados
          }
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(datosParaGuardar))

        // C. Actualizar estado de la App
        setEstadoFuentes(prev => ({...prev, ...nuevosEstados}))
        setNoticias(procesarColores(res.data.noticias))
        setCargandoNoticias(false)
      })
      .catch((err) => {
        console.error(err)
        setCargandoNoticias(false)
      })
  }

  // Función auxiliar para repintar colores (necesaria porque el caché guarda datos crudos)
  const procesarColores = (listaNoticias) => {
    return listaNoticias.map(noticia => {
      const fuenteOrigen = fuentes.find(f => f.url === noticia.url_origen) 
      let colorCaja = '#000'
      if (fuenteOrigen) {
         const caja = cajas.find(c => c.id === fuenteOrigen.box_id)
         if (caja) colorCaja = caja.color
      }
      return { ...noticia, color: colorCaja }
    })
  }

  const generarPost = (noticia) => {
    setCargandoIA(true)
    axios.post('https://mi-ap-noticias.onrender.com/generar-post', { titulo: noticia.titulo, resumen: noticia.resumen, fuente: noticia.fuente })
    .then(res => { setPostContent(res.data.contenido); setMostrarModalPost(true); setCargandoIA(false) })
    .catch(() => setCargandoIA(false))
  }

  // --- RENDER ---
  if (loadingInit) return <div className="container modo-carga">CARGANDO...</div>
  if (!session) return <Auth />
  if (!username) return <UsernameForm session={session} onNombreGuardado={setUsername} />

  return (
    <div className="app-layout">
      
      

      <ModalCaja isOpen={modalCrearOpen} onClose={() => setModalCrearOpen(false)} onConfirm={crearCaja} tituloModal="NUEVA CAJA" />
      <ModalCaja isOpen={modalEditarOpen} onClose={() => setModalEditarOpen(false)} onConfirm={actualizarCaja} tituloModal="EDITAR CAJA" initialName={cajaParaEditar?.name} initialColor={cajaParaEditar?.color}/>
      {mostrarModalPost && <ModalPostEditor onClose={() => setMostrarModalPost(false)} content={postContent} setContent={setPostContent} onCopy={() => navigator.clipboard.writeText(postContent)} />}

      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
  
        {/* --- AQUÍ PEGAS EL BOTÓN QUE CORTASTE --- */}
        <button 
          className={`toggle-btn ${sidebarOpen ? 'open' : ''}`} 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          title={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {/* Cambiamos el SVG complejo por una flecha simple para el piquito */}
          {sidebarOpen ? '▼' : '▲'}
        </button>
        {/* -------------------------------------- */}

        <div className="sidebar-header">
          <div className="user-welcome">Hola, {username}</div>
        </div>
        
        <div className="sidebar-header">
           <div className="user-welcome">Hola, {username}</div>
        </div>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', paddingLeft:'5px'}}>
           <span style={{fontSize:'0.75rem', fontWeight:'900', color:'#999', letterSpacing:'1px'}}>MIS COLECCIONES</span>
        </div>

        <ul className="boxes-list">
          {cajas.map(caja => {
            const isVisible = cajasVisibles.has(caja.id)
            const isEditing = cajaEditando?.id === caja.id
            return (
              <li key={caja.id} className={`box-item ${isEditing ? 'editing' : ''}`} onClick={() => setCajaEditando(caja)}>
                <div className="box-left">
                  <div className="color-bar" style={{background: caja.color}}></div>
                  <span style={{fontWeight: isEditing ? '800' : '600'}}>{caja.name}</span>
                </div>
                
                <div className="box-actions">
                  <button className={`icon-btn ${isVisible ? 'active-eye' : ''}`} onClick={(e) => { e.stopPropagation(); toggleVisibilidad(caja.id); }}>
                    {isVisible ? (
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    ) : (
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    )}
                  </button>
                  <button className="icon-btn" onClick={(e) => borrarCaja(e, caja.id)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
              </li>
            )
          })}
        </ul>

        <button className="btn-new-box" onClick={() => setModalCrearOpen(true)}>+ NUEVA CAJA</button>
        <button onClick={() => supabase.auth.signOut()} className="btn-logout">CERRAR SESIÓN</button>
      </aside>

      <main className="main-content">
        <div className="content-header">
          <div className="box-title-container">
            <h2 className="box-title" style={{color: cajaEditando ? cajaEditando.color : 'black'}}>
              {cajaEditando ? cajaEditando.name : 'Mi Feed'}
            </h2>
            
            {/* --- NUEVO: BOTÓN DE REFRESCAR --- */}
            {cajaEditando && (
              <div style={{display:'flex', gap:'10px'}}>
                <button 
                  className="btn-edit-box" 
                  // Deshabilitamos el click si ya está cargando
                  disabled={cargandoNoticias}
                  style={{ opacity: cargandoNoticias ? 0.7 : 1, cursor: cargandoNoticias ? 'wait' : 'pointer' }}
                  onClick={() => {
                     const urlsActuales = fuentes.filter(f => f.box_id === cajaEditando.id).map(f => f.url)
                     cargarNoticiasAPI(urlsActuales, true) 
                  }}
                  title="Buscar noticias nuevas ahora"
                >
                  {/* Aquí aplicamos la clase condicional */}
                  <span className={cargandoNoticias ? 'rotating' : ''} style={{display:'inline-block', marginRight:'5px'}}>
                    ↻
                  </span> 
                  {cargandoNoticias ? 'CARGANDO...' : 'REFRESCAR'}
                </button>
                <button className="btn-edit-box" onClick={() => abrirModalEdicion(cajaEditando)}>
                  EDITAR ✎
                </button>
              </div>
            )}
            {/* ---------------------------------- */}
            
          </div>
        </div>

        {cajaEditando && (
          <div className="sources-panel">
            <div className="input-group">
              <input 
                className="input-url" 
                type="text" 
                placeholder="Pega URL (https://...)" 
                value={inputUrl} 
                onChange={e => setInputUrl(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && agregarFuente()}
              />
              <button className="btn-add" onClick={agregarFuente}>
                AÑADIR
              </button>
            </div>
            
            <div style={{marginTop:'15px', display:'flex', flexWrap:'wrap', gap:'10px'}}>
              {fuentes.filter(f => f.box_id === cajaEditando.id).map(f => {
                // AQUÍ CALCULAMOS EL ICONO SEGÚN EL ESTADO
                const status = estadoFuentes[f.url]
                return (
                  <div key={f.id} style={{background:'white', border:'1px solid #ddd', padding:'5px 10px', borderRadius:'4px', fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'8px', fontWeight:'500'}}>
                    
                    {/* ICONOS DE ESTADO (NEGROS PUROS) */}
                    {status === 'ok' && (
                       <span title="Fuente activa" style={{color:'black', fontSize:'1rem'}}>✔</span>
                    )}
                    {status === 'error' && (
                       <span title="No se pudo leer" style={{color:'black', fontSize:'1rem'}}>✘</span>
                    )}
                    
                    <span style={{maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: status === 'error' ? '#999' : 'black'}}>
                       {f.url}
                    </span>
                    <button onClick={() => borrarFuente(f.id)} style={{color:'red', border:'none', background:'none', cursor:'pointer', fontWeight:'bold', marginLeft:'5px'}}>×</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="news-grid">
          {cargandoNoticias ? (
            [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
          ) : (
            noticias.map((noticia, index) => (
              <div 
                key={index} 
                className="news-card" 
                style={{ 
                  borderColor: noticia.color || 'black',
                  animationDelay: `${index * 0.1}s` 
                }}
              >
                <div>
                   <span className="news-source-tag" style={{backgroundColor: noticia.color || 'black'}}>{noticia.fuente}</span>
                   <h3 className="news-title">{noticia.titulo}</h3>
                   <div className="news-summary">{noticia.resumen}</div>
                </div>
                <div className="actions">
                  <a href={noticia.link} target="_blank" rel="noopener noreferrer" className="btn-card">LEER</a>
                  <button onClick={() => generarPost(noticia)} disabled={cargandoIA} className="btn-card primary">
                    {cargandoIA ? 'PENSANDO...' : 'IA POST'}
                  </button>
                </div>
              </div>
            ))
          )}
          
          {!cargandoNoticias && noticias.length === 0 && (
             <div style={{textAlign:'center', gridColumn:'1/-1', color:'#999', marginTop:'50px'}}>
                <p style={{fontFamily:'Merriweather', fontSize:'1.2rem'}}>Todo tranquilo por aquí.</p>
                <p>Activa el ojo 👁️ de una caja para leer.</p>
             </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App