import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function UsernameForm({ session, onNombreGuardado }) {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoading(true)

    // Guardamos el nombre en la tabla 'profiles'
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        email: session.user.email,
        username: nombre
      })

    if (error) {
      setErrorMsg('Error al guardar: ' + error.message)
      setLoading(false)
    } else {
      onNombreGuardado(nombre)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-content">
        <h1 className="brand-header">
          NEWS<span style={{ color: '#666' }}>AGG</span>.
        </h1>

        <div className="auth-card-modern">
          <h2 className="auth-title-modern">¡Casi listos!</h2>
          <p className="auth-subtitle-modern">¿Cómo te gustaría que te llamemos?</p>

          <form onSubmit={handleSubmit}>
            <div className="input-field-wrapper">
              <input
                type="text"
                className="modern-input"
                placeholder="Nombre de Usuario"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="auth-alert error">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn-modern-primary"
              disabled={loading}
            >
              {loading ? 'GUARDANDO...' : 'COMENZAR'}
            </button>
          </form>
        </div>

        <div className="auth-footer-modern">
          Configura tu perfil para empezar a curar contenido.
        </div>
      </div>
    </div>
  )
}