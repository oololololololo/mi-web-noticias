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
    // Usamos 'upsert' para crear la fila si no existe o actualizarla si ya existe
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
      // Avisamos a App.jsx que ya terminamos
      onNombreGuardado(nombre) 
    }
  }

  return (
    <div className="container modo-carga">
      <div className="config-panel" style={{maxWidth: '500px'}}>
        <h1 style={{fontSize: '2rem', marginBottom: '10px'}}>CASI LISTOS...</h1>
        <p>¿Cómo te gustaría que te llamemos?</p>

        <form onSubmit={handleSubmit} style={{marginTop: '30px'}}>
          <label style={{display:'block', textAlign:'left', fontSize:'0.75rem', fontWeight:'bold', marginBottom:'5px'}}>NOMBRE DE USUARIO</label>
          <input 
            type="text" 
            placeholder="Ej: Tobias Tech"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            autoFocus
            style={{ 
              width:'100%', 
              padding: '15px', 
              border: '2px solid black', 
              boxSizing: 'border-box',
              fontSize: '1.2rem',
              marginBottom: '20px'
            }} 
          />

          {errorMsg && <div style={{color: 'red', marginBottom: '15px', fontWeight:'bold'}}>{errorMsg}</div>}

          <button 
            type="submit" 
            className="btn-big-start" 
            disabled={loading}
          >
            {loading ? 'GUARDANDO...' : 'COMENZAR'}
          </button>
        </form>
      </div>
    </div>
  )
}