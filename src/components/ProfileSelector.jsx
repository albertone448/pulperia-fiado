import { useState, useEffect } from 'react'
import { ref, push, update } from 'firebase/database'
import { db } from '../firebase'

export default function ProfileSelector({ perfiles, onSeleccionar, onCerrarSesion }) {
  const [perfilParaPin, setPerfilParaPin] = useState(null) // id del perfil al que se le va a pedir PIN
  const [pinIngresado, setPinIngresado] = useState('')
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)

  const listaPerfiles = Object.entries(perfiles || {})

  function abrirPin(id) {
    setPerfilParaPin(id)
    setPinIngresado('')
    setError('')
  }

  function digitar(num) {
    if (pinIngresado.length >= 4) return
    const nuevoPin = pinIngresado + num
    setPinIngresado(nuevoPin)
    if (nuevoPin.length === 4) {
      verificarPin(nuevoPin)
    }
  }

  function verificarPin(pin) {
    const perfil = perfiles[perfilParaPin]
    if (perfil && String(perfil.pin) === pin) {
      onSeleccionar(perfilParaPin)
    } else {
      setError('PIN incorrecto')
      setTimeout(() => {
        setPinIngresado('')
        setError('')
      }, 700)
    }
  }

  // Permite escribir el PIN con el teclado físico, además de tocar los números en pantalla.
  useEffect(() => {
    if (!perfilParaPin) return
    function manejarTecla(e) {
      if (e.key >= '0' && e.key <= '9') {
        digitar(e.key)
      } else if (e.key === 'Backspace') {
        setPinIngresado((p) => p.slice(0, -1))
      }
    }
    window.addEventListener('keydown', manejarTecla)
    return () => window.removeEventListener('keydown', manejarTecla)
  }, [perfilParaPin, pinIngresado])

  if (creando) {
    return <CrearPerfil onCancelar={() => setCreando(false)} onCreado={() => setCreando(false)} />
  }

  if (perfilParaPin) {
    const perfil = perfiles[perfilParaPin]
    return (
      <div className="pantalla-centrada">
        <div className="tarjeta-pin">
          <button className="btn-link" onClick={() => setPerfilParaPin(null)}>
            &larr; Volver
          </button>
          <h2 className="pin-titulo">Hola, {perfil?.nombre}</h2>
          <p className="pin-sub">Ingresá tu PIN</p>
          <div className="pin-puntos">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < pinIngresado.length ? 'pin-punto pin-punto-lleno' : 'pin-punto'} />
            ))}
          </div>
          {error && <p className="mensaje-error">{error}</p>}
          <div className="pin-teclado">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} className="pin-tecla" onClick={() => digitar(String(n))}>
                {n}
              </button>
            ))}
            <button
              className="pin-tecla pin-tecla-borrar"
              onClick={() => setPinIngresado((p) => p.slice(0, -1))}
            >
              &#9003;
            </button>
            <button className="pin-tecla" onClick={() => digitar('0')}>
              0
            </button>
            <span />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pantalla-centrada">
      <div className="selector-perfiles">
        <h1 className="selector-titulo">¿Quién sos?</h1>
        <div className="lista-perfiles">
          {listaPerfiles.map(([id, perfil]) => (
            <button key={id} className="perfil-card" onClick={() => abrirPin(id)}>
              <span className="perfil-avatar">{perfil.nombre?.[0]?.toUpperCase()}</span>
              <span className="perfil-nombre">{perfil.nombre}</span>
            </button>
          ))}
          <button className="perfil-card perfil-card-nuevo" onClick={() => setCreando(true)}>
            <span className="perfil-avatar perfil-avatar-nuevo">+</span>
            <span className="perfil-nombre">Nuevo perfil</span>
          </button>
        </div>
        <button className="btn-link" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function CrearPerfil({ onCancelar, onCreado }) {
  const [nombre, setNombre] = useState('')
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (nombre.trim().length < 2) {
      setError('Poné un nombre válido')
      return
    }
    if (!/^\d{4}$/.test(pin1)) {
      setError('El PIN debe ser de 4 números')
      return
    }
    if (pin1 !== pin2) {
      setError('Los PIN no coinciden')
      return
    }
    const nuevoRef = push(ref(db, 'perfiles'))
    update(nuevoRef, { nombre: nombre.trim(), pin: pin1 })
    onCreado()
  }

  return (
    <div className="pantalla-centrada">
      <form className="tarjeta-login" onSubmit={handleSubmit}>
        <h2 className="tarjeta-login-titulo">Nuevo perfil</h2>

        <label className="campo-label">Nombre</label>
        <input className="campo-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />

        <label className="campo-label">PIN (4 números)</label>
        <input
          className="campo-input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin1}
          onChange={(e) => setPin1(e.target.value.replace(/\D/g, ''))}
        />

        <label className="campo-label">Repetí el PIN</label>
        <input
          className="campo-input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin2}
          onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))}
        />

        {error && <p className="mensaje-error">{error}</p>}

        <button className="btn-primario" type="submit">
          Crear perfil
        </button>
        <button className="btn-secundario" type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </form>
    </div>
  )
}
