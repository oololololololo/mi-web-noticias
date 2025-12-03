import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

// --- COMPONENTES AUXILIARES (DEFINIDOS FUERA DE APP) ---

const ModalStatus = ({ onClose, urls, errors }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>ESTADO DE FUENTES</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <ul className="status-list">
        {urls.map((url, index) => {
          const fallo = errors.includes(url);
          return (
            <li key={index} className="status-item">
              <span className="url-text" title={url}>{url}</span>
              {fallo ? (
                <span className="status-label label-error">ERROR</span>
              ) : (
                <span className="status-label label-success">ACTIVO</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  </div>
)

const ModalPostEditor = ({ onClose, content, setContent, onCopy }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>BORRADOR IA</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <p style={{marginBottom:'10px', fontSize:'0.9rem', color:'#666'}}>
        Edita el contenido antes de copiarlo:
      </p>

      <textarea 
        className="editor-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)} // ¡Ahora sí fluirá al escribir!
        placeholder="Escribe aquí..."
        autoFocus // Pone el cursor automáticamente al abrir
      />

      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>CANCELAR</button>
        <button className="btn-copy" onClick={onCopy}>COPIAR TEXTO</button>
      </div>
    </div>
  </div>
)

// --- COMPONENTE PRINCIPAL ---

function App() {
  const [noticias, setNoticias] = useState([])
  const [cargandoIA, setCargandoIA] = useState(false)

  // Configuración
  const [misUrls, setMisUrls] = useState(() => {
    const guardadas = localStorage.getItem('mis_fuentes_rss');
    return guardadas ? JSON.parse(guardadas) : [];
  })
  
  const [modoConfig, setModoConfig] = useState(misUrls.length === 0)
  const [inputUrl, setInputUrl] = useState('')
  const [cargando, setCargando] = useState(false)
  
  // Estados UI
  const [errores, setErrores] = useState([]) 
  const [mostrarModalStatus, setMostrarModalStatus] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  // Estados Editor
  const [mostrarModalPost, setMostrarModalPost] = useState(false)
  const [postContent, setPostContent] = useState('')

  useEffect(() => {
    if (misUrls.length > 0) {
      cargarNoticias(misUrls);
    }
  }, [])

  const cargarNoticias = (urlsAUsar) => {
    if (urlsAUsar.length === 0) return;
    setCargando(true);
    setModoConfig(false);

    axios.post('https://mi-ap-noticias.onrender.com/obtener-noticias', { urls: urlsAUsar })
      .then(response => {
        setNoticias(response.data.noticias)
        setErrores(response.data.fallos) 
        setCargando(false)

        if (response.data.fallos.length > 0) {
          setToastMsg(`ATENCIÓN: ${response.data.fallos.length} FUENTES NO DISPONIBLES`);
          setTimeout(() => setToastMsg(null), 5000);
        }
      })
      .catch(() => {
        setCargando(false)
        setToastMsg("ERROR DE CONEXIÓN CON EL SERVIDOR")
      })
  }

  const agregarUrl = () => {
    if (!inputUrl) return;
    const nuevas = [...misUrls, inputUrl];
    setMisUrls(nuevas);
    localStorage.setItem('mis_fuentes_rss', JSON.stringify(nuevas));
    setInputUrl('');
  }

  const borrarUrl = (index) => {
    const nuevas = misUrls.filter((_, i) => i !== index);
    setMisUrls(nuevas);
    localStorage.setItem('mis_fuentes_rss', JSON.stringify(nuevas));
  }

  const irAGaleria = () => {
    cargarNoticias(misUrls);
  }

  const generarPost = (noticia) => {
    setCargandoIA(true)
    setToastMsg("REDACTANDO BORRADOR CON IA...");

    axios.post('https://mi-ap-noticias.onrender.com/generar-post', {
      titulo: noticia.titulo,
      resumen: noticia.resumen,
      fuente: noticia.fuente
    })
    .then(response => {
      setCargandoIA(false)
      setToastMsg(null)
      setPostContent(response.data.contenido)
      setMostrarModalPost(true)
    })
    .catch(() => {
      setCargandoIA(false)
      setToastMsg("ERROR AL CONECTAR CON IA")
      setTimeout(() => setToastMsg(null), 3000);
    })
  }

  const copiarYcerrar = () => {
    navigator.clipboard.writeText(postContent)
    setMostrarModalPost(false)
    setToastMsg("COPIADO AL PORTAPAPELES")
    setTimeout(() => setToastMsg(null), 3000);
  }

  // --- RENDERIZADO PRINCIPAL ---

  if (modoConfig) {
    return (
      <div className="container modo-carga">
        <div className="config-panel">
          <h1>CONFIGURA TUS FUENTES</h1>
          <p>Pega los enlaces de las webs que quieras seguir.</p>
          <div className="input-group">
            <input type="text" placeholder="Ej: https://techcrunch.com" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} />
            <button onClick={agregarUrl} className="btn btn-primary" style={{padding:'0 20px'}}>AÑADIR</button>
          </div>
          <ul className="url-list">
            {misUrls.map((url, index) => (
              <li key={index}>
                <span>{url}</span>
                <button onClick={() => borrarUrl(index)} className="btn-delete">ELIMINAR</button>
              </li>
            ))}
          </ul>
          {misUrls.length > 0 && (
            <button onClick={irAGaleria} className="btn-big-start">GUARDAR Y CARGAR NOTICIAS →</button>
          )}
          <div className="ejemplos" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <p style={{ fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold' }}>TIP</p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>Solo pega la dirección principal de la web. <br />Nosotros encontraremos las noticias.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`container ${cargando ? 'modo-carga' : 'modo-galeria'}`}>
      
      {mostrarModalStatus && (
        <ModalStatus 
          onClose={() => setMostrarModalStatus(false)}
          urls={misUrls}
          errors={errores}
        />
      )}

      {mostrarModalPost && (
        <ModalPostEditor 
          onClose={() => setMostrarModalPost(false)}
          content={postContent}
          setContent={setPostContent}
          onCopy={copiarYcerrar}
        />
      )}

      {toastMsg && <div className="toast-notification">{toastMsg}</div>}

      <header>
        <h1>NEWS AGGREGATOR</h1>
        <div className="header-buttons">
          <button onClick={() => setModoConfig(true)} className="btn-config">EDITAR FUENTES</button>
          <button onClick={() => setMostrarModalStatus(true)} className="btn-status">ESTADO DE FUENTES</button>
        </div>
      </header>

      {cargando ? (
        <div className="loading-msg">CONECTANDO CON FUENTES GLOBALES...</div>
      ) : (
        <div className="news-grid">
          {noticias.length > 0 ? noticias.map((noticia, index) => (
            <div key={index} className="news-card">
              <div className="card-content">
                <div className="news-source">{noticia.fuente}</div>
                <h3 className="news-title">{noticia.titulo}</h3>
                <div className="news-summary">{noticia.resumen}</div>
              </div>
              <div className="actions">
                <a href={noticia.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">LEER</a>
                <button onClick={() => generarPost(noticia)} disabled={cargandoIA} className="btn btn-primary">
                  {cargandoIA ? '...' : 'CREAR POST'}
                </button>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', width: '100%', marginTop: '50px' }}>
              <p style={{fontWeight:'bold'}}>NO SE ENCONTRARON NOTICIAS</p>
              <p style={{fontSize:'0.9rem', color:'#666'}}>REVISA EL ESTADO DE TUS FUENTES</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App