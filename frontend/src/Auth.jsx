import { useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [modoRegistro, setModoRegistro] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) {
      setMensaje({ tipo: 'error', texto: error.message })
      setLoading(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMensaje(null)
    if (modoRegistro) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMensaje({ tipo: 'error', texto: error.message })
      else setMensaje({ tipo: 'exito', texto: '¡Registro exitoso! Revisa tu correo.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMensaje({ tipo: 'error', texto: error.message })
    }
    setLoading(false)
  }

  return (
    <div className="container modo-carga">
      <div className="config-panel" style={{maxWidth: '500px'}}>
        <h1 style={{fontSize: '2.2rem', marginBottom: '5px'}}>
          {modoRegistro ? 'ÚNETE AHORA' : 'BIENVENIDO'}
        </h1>
        <p style={{marginTop: '0'}}>Tu feed de noticias inteligente.</p>
        
        {/* BOTÓN GOOGLE MEJORADO */}
        <button 
          onClick={handleGoogleLogin} 
          className="btn-big-start" 
          disabled={loading}
          style={{ 
            background: 'white', 
            color: '#333', 
            border: '2px solid black', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            marginBottom: '20px',
            height: '55px',
            fontSize: '0.9rem'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          CONTINUAR CON GOOGLE
        </button>

        {/* SEPARADOR VISUAL */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'center', margin:'25px 0', opacity: 0.5}}>
           <div style={{height: '1px', background: 'black', flex: 1}}></div>
           <span style={{padding: '0 15px', fontSize: '0.8rem', fontWeight: 'bold'}}>O USA TU CORREO</span>
           <div style={{height: '1px', background: 'black', flex: 1}}></div>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{display:'block', textAlign:'left', fontSize:'0.75rem', fontWeight:'bold', marginBottom:'5px'}}>EMAIL</label>
            <input 
              className="input-auth" 
              type="email" 
              placeholder="nombre@ejemplo.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
              style={{ width:'100%', padding: '15px', border: '2px solid black', boxSizing: 'border-box' }} 
            />
          </div>
          <div>
            <label style={{display:'block', textAlign:'left', fontSize:'0.75rem', fontWeight:'bold', marginBottom:'5px'}}>CONTRASEÑA</label>
            <input 
              className="input-auth" 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
              style={{ width:'100%', padding: '15px', border: '2px solid black', boxSizing: 'border-box' }} 
            />
          </div>
          
          <button type="submit" className="btn-big-start" disabled={loading} style={{marginTop: '10px'}}>
            {loading ? 'CARGANDO...' : (modoRegistro ? 'REGISTRARSE' : 'ENTRAR AL SISTEMA')}
          </button>
        </form>

        <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <p style={{fontSize: '0.9rem', marginBottom: '10px'}}>{modoRegistro ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}</p>
          <button 
            onClick={() => { setModoRegistro(!modoRegistro); setMensaje(null); }}
            style={{ 
              background: 'transparent', 
              border: '2px solid black', 
              padding: '8px 20px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              fontSize: '0.8rem',
              textTransform: 'uppercase'
            }}
          >
            {modoRegistro ? 'Inicia Sesión' : 'Crear Cuenta Gratis'}
          </button>
        </div>
        
        {mensaje && (
          <div style={{ 
            marginTop: '20px', 
            padding: '10px', 
            background: mensaje.tipo === 'error' ? '#ffeeee' : '#eeffee',
            border: mensaje.tipo === 'error' ? '2px solid red' : '2px solid green',
            color: 'black', 
            fontWeight: 'bold',
            fontSize: '0.9rem' 
          }}>
            {mensaje.texto}
          </div>
        )}
      </div>
    </div>
  )
}