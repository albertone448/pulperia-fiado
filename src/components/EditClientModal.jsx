import { useState } from 'react'
import { ref, update } from 'firebase/database'
import { db } from '../firebase'
import { formatColones } from '../utils/dateUtils'

export default function EditClientModal({ clienteId, cliente, deuda, onCerrar, onEliminado }) {
  const [nombre, setNombre] = useState(cliente.nombre || '')
  const [telefono, setTelefono] = useState(cliente.telefono || '')
  const [correo, setCorreo] = useState(cliente.correo || '')
  const [notificarWhatsapp, setNotificarWhatsapp] = useState(cliente.notificarWhatsapp !== false)
  const [notificarCorreo, setNotificarCorreo] = useState(!!cliente.notificarCorreo)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(null) // 'eliminar' | 'suspender' | 'reactivar' | null

  const puedeEliminar = deuda === 0
  const estaSuspendido = !!cliente.suspendido

  function handleSubmit(e) {
    e.preventDefault()
    if (nombre.trim().length < 2) {
      setError('Poné un nombre válido')
      return
    }
    update(ref(db, `clientes/${clienteId}`), {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      correo: correo.trim() || null,
      // Sin teléfono/correo no hay a dónde mandar el aviso, así que la
      // preferencia queda en false aunque el checkbox estuviera marcado.
      notificarWhatsapp: telefono.trim() ? notificarWhatsapp : false,
      notificarCorreo: correo.trim() ? notificarCorreo : false,
    })
    onCerrar()
  }

  // Borrado lógico: el cliente se marca como inactivo y desaparece de la lista
  // principal, pero el registro y su historial quedan intactos y se puede
  // restaurar después desde "Clientes eliminados".
  function handleEliminar() {
    if (!puedeEliminar) return
    update(ref(db, `clientes/${clienteId}`), {
      inactivo: true,
      inactivoDesde: Date.now(),
    })
    onEliminado?.()
  }

  // Suspensión: para clientes que dejaron de venir pero podrían volver. Se
  // mantiene en la lista de clientes, separado abajo del todo, y no se le
  // pueden anotar compras nuevas, pero sigue viéndose con normalidad para
  // consultarlo o registrarle pagos.
  function handleSuspender() {
    update(ref(db, `clientes/${clienteId}`), {
      suspendido: true,
      suspendidoDesde: Date.now(),
    })
    onCerrar()
  }

  function handleReactivar() {
    update(ref(db, `clientes/${clienteId}`), {
      suspendido: null,
      suspendidoDesde: null,
    })
    onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-titulo">Editar cliente</h2>

        <label className="campo-label">Nombre completo</label>
        <input className="campo-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />

        <label className="campo-label">Teléfono (opcional)</label>
        <input className="campo-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

        <label className="campo-label">Correo electrónico (opcional)</label>
        <input
          className="campo-input"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />

        <label className="campo-label">Notificaciones automáticas</label>
        <div className="campo-checkbox">
          <label>
            <input
              type="checkbox"
              checked={telefono.trim() ? notificarWhatsapp : false}
              disabled={!telefono.trim()}
              onChange={(e) => setNotificarWhatsapp(e.target.checked)}
            />
            Avisar por WhatsApp
          </label>
          <label>
            <input
              type="checkbox"
              checked={correo.trim() ? notificarCorreo : false}
              disabled={!correo.trim()}
              onChange={(e) => setNotificarCorreo(e.target.checked)}
            />
            Avisar por correo
          </label>
        </div>

        {error && <p className="mensaje-error">{error}</p>}

        {confirmando === 'eliminar' && (
          <div className="confirmacion-borrado">
            <p>¿Seguro que querés eliminar a {cliente.nombre}? Podés restaurarlo después desde "Clientes eliminados".</p>
            <div className="modal-acciones">
              <button className="btn-secundario" type="button" onClick={() => setConfirmando(null)}>
                No
              </button>
              <button className="btn-peligro" type="button" onClick={handleEliminar}>
                Sí, eliminar
              </button>
            </div>
          </div>
        )}

        {confirmando === 'suspender' && (
          <div className="confirmacion-borrado">
            <p>
              ¿Suspender a {cliente.nombre}? Va a pasar a la sección de suspendidos, al final de la lista de
              clientes, y no se le van a poder anotar compras nuevas, pero sí se le pueden seguir registrando pagos.
              Se puede reactivar cuando quieras.
            </p>
            <div className="modal-acciones">
              <button className="btn-secundario" type="button" onClick={() => setConfirmando(null)}>
                No
              </button>
              <button className="btn-primario" type="button" onClick={handleSuspender}>
                Sí, suspender
              </button>
            </div>
          </div>
        )}

        {confirmando === 'reactivar' && (
          <div className="confirmacion-borrado">
            <p>
              ¿Reactivar a {cliente.nombre}? Vuelve a la lista de clientes activos y se le pueden anotar compras
              con normalidad.
            </p>
            <div className="modal-acciones">
              <button className="btn-secundario" type="button" onClick={() => setConfirmando(null)}>
                No
              </button>
              <button className="btn-primario" type="button" onClick={handleReactivar}>
                Sí, reactivar
              </button>
            </div>
          </div>
        )}

        {!confirmando && (
          <>
            <div className="modal-acciones-secundarias">
              <button
                className="btn-peligro-texto"
                type="button"
                disabled={!puedeEliminar}
                onClick={() => setConfirmando('eliminar')}
              >
                Eliminar cliente
              </button>
              <button
                className="btn-link"
                type="button"
                onClick={() => setConfirmando(estaSuspendido ? 'reactivar' : 'suspender')}
              >
                {estaSuspendido ? 'Reactivar cliente' : 'Suspender cliente'}
              </button>
            </div>
            {!puedeEliminar && (
              <p className="texto-trazabilidad">
                Solo se puede eliminar si el saldo está en cero (debe {formatColones(deuda)}).
              </p>
            )}

            <div className="modal-acciones">
              <button className="btn-secundario" type="button" onClick={onCerrar}>
                Cancelar
              </button>
              <button className="btn-primario" type="submit">
                Guardar
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
