import { useState } from 'react'
import { supabase } from './supabaseClient'
import { ArrowRight, Mail, Lock, User, Loader2 } from 'lucide-react'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Simula una pequeña espera para ver el loading aesthetic
    await new Promise(r => setTimeout(r, 600))

    let result
    if (isLogin) {
      result = await supabase.auth.signInWithPassword({ email, password })
    } else {
      result = await supabase.auth.signUp({ email, password })
    }

    const { error } = result
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      if (!isLogin) {
        setMessage({ type: 'exito', text: '¡Cuenta creada! Revisa tu email.' })
      }
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
  }

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="brand-header">
          NEWS<span style={{ color: '#666' }}>AGG</span>.
        </div>

        <div className="auth-card-modern">
          <div className="auth-header">
            <h2 className="auth-title-modern">{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
            <p className="auth-subtitle-modern">Accede a tu feed personalizado de noticias.</p>
          </div>

          {message && (
            <div className={`auth-alert ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleAuth} className="auth-form-modern">
            <div className="input-field-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                className="modern-input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-field-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                className="modern-input"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn-modern-primary" disabled={loading}>
              {loading ? <Loader2 className="rotating" size={20} /> : (
                <>
                  {isLogin ? 'Entrar' : 'Registrarse'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-separator-modern">
            <span>O CONTINÚA CON</span>
          </div>

          <button className="btn-modern-google" onClick={handleGoogleLogin} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z" /></svg>
            Google
          </button>

          <div className="auth-footer-modern">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
            <button className="btn-link-modern" onClick={() => { setIsLogin(!isLogin); setMessage(null); }}>
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}