import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await signInWithEmailAndPassword(auth, correo.trim(), clave)
    } catch (err) {
      setError('Correo o contraseña incorrectos.')
    }
    setCargando(false)
  }

  return (
    <div className="pantalla-centrada">
      <form className="tarjeta-login" onSubmit={handleSubmit}>
        <h1 className="tarjeta-login-titulo">Mini Super</h1>
        <p className="tarjeta-login-sub">Sistema de fiado</p>

        <label className="campo-label">Correo</label>
        <input
          className="campo-input"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          autoFocus
        />

        <label className="campo-label">Contraseña</label>
        <input
          className="campo-input"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          required
        />

        {error && <p className="mensaje-error">{error}</p>}

        <button className="btn-primario" type="submit" disabled={cargando}>
          {cargando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
