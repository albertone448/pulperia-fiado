import { useEffect, useState, useRef } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { ref, onValue } from 'firebase/database'
import { auth, db } from './firebase'
import Login from './components/Login'
import ProfileSelector from './components/ProfileSelector'
import ClientList from './components/ClientList'
import ClientDetail from './components/ClientDetail'
import DailySummary from './components/DailySummary'

// Después de este tiempo sin tocar nada, se vuelve a pedir el perfil (PIN).
// No cierra la sesión de Firebase, solo "desloguea" el perfil activo.
const MINUTOS_INACTIVIDAD = 5

export default function App() {
  const [authUser, setAuthUser] = useState(undefined) // undefined = cargando
  const [perfiles, setPerfiles] = useState({})
  const [clientes, setClientes] = useState({})
  const [transacciones, setTransacciones] = useState({})
  const [perfilActivo, setPerfilActivo] = useState(null)
  const [vista, setVista] = useState('clientes') // 'clientes' | 'resumen'
  const [clienteAbiertoId, setClienteAbiertoId] = useState(null)

  const inactividadTimer = useRef(null)

  // Escucha el estado de sesión de Firebase Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setAuthUser(user))
    return () => unsub()
  }, [])

  // Se suscribe a los 3 nodos de la base de datos cuando ya hay sesión
  useEffect(() => {
    if (!authUser) return
    const unsubPerfiles = onValue(ref(db, 'perfiles'), (snap) => setPerfiles(snap.val() || {}))
    const unsubClientes = onValue(ref(db, 'clientes'), (snap) => setClientes(snap.val() || {}))
    const unsubTransacciones = onValue(ref(db, 'transacciones'), (snap) => setTransacciones(snap.val() || {}))
    return () => {
      unsubPerfiles()
      unsubClientes()
      unsubTransacciones()
    }
  }, [authUser])

  // Control de inactividad: reinicia el contador con cualquier click o tecla
  useEffect(() => {
    if (!perfilActivo) return

    const resetTimer = () => {
      clearTimeout(inactividadTimer.current)
      inactividadTimer.current = setTimeout(() => {
        setPerfilActivo(null)
        setVista('clientes')
        setClienteAbiertoId(null)
      }, MINUTOS_INACTIVIDAD * 60 * 1000)
    }

    resetTimer()
    window.addEventListener('click', resetTimer)
    window.addEventListener('keydown', resetTimer)
    return () => {
      clearTimeout(inactividadTimer.current)
      window.removeEventListener('click', resetTimer)
      window.removeEventListener('keydown', resetTimer)
    }
  }, [perfilActivo])

  if (authUser === undefined) {
    return <div className="pantalla-carga">Cargando...</div>
  }

  if (!authUser) {
    return <Login />
  }

  if (!perfilActivo) {
    return (
      <ProfileSelector
        perfiles={perfiles}
        onSeleccionar={(id) => setPerfilActivo(id)}
        onCerrarSesion={() => signOut(auth)}
      />
    )
  }

  const clienteAbierto = clienteAbiertoId ? clientes[clienteAbiertoId] : null

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-titulo">
          <span className="app-header-logo">Minisúper El Puente</span>
          <span className="app-header-sub">Fiado</span>
        </div>
        <div className="app-header-derecha">
          <span className="perfil-activo-badge">{perfiles[perfilActivo]?.nombre}</span>
          <button className="btn-link" onClick={() => setPerfilActivo(null)}>
            Cambiar perfil
          </button>
        </div>
      </header>

      {!clienteAbierto && (
        <nav className="tabs">
          <button
            className={vista === 'clientes' ? 'tab tab-activo' : 'tab'}
            onClick={() => setVista('clientes')}
          >
            Clientes
          </button>
          <button
            className={vista === 'resumen' ? 'tab tab-activo' : 'tab'}
            onClick={() => setVista('resumen')}
          >
            Resumen del día
          </button>
        </nav>
      )}

      <main className="app-main">
        {clienteAbierto ? (
          <ClientDetail
            clienteId={clienteAbiertoId}
            cliente={clienteAbierto}
            transacciones={transacciones}
            perfilActivo={perfilActivo}
            perfiles={perfiles}
            onVolver={() => setClienteAbiertoId(null)}
          />
        ) : vista === 'clientes' ? (
          <ClientList
            clientes={clientes}
            transacciones={transacciones}
            onAbrirCliente={(id) => setClienteAbiertoId(id)}
          />
        ) : (
          <DailySummary
            clientes={clientes}
            transacciones={transacciones}
            perfiles={perfiles}
          />
        )}
      </main>
    </div>
  )
}
