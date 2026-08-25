import { useState } from 'react'
import { ref, update } from 'firebase/database'
import { db } from '../firebase'
import { formatColones } from '../utils/dateUtils'

export default function EditClientModal({ clienteId, cliente, deuda, onCerrar, onEliminado }) {
  const [nombre, setNombre] = useState(cliente.nombre || '')
  const [telefono, setTelefono] = useState(cliente.telefono || '')
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
    })
    onCerrar()
  }

  // Borrado lógico: el cliente se marca como inactivo y desaparece de la lista
  // principal, pero el registro y su historial quedan intactos y se puede
  // restaurar después desde "Suspendidos y eliminados".
  function handleEliminar() {
    if (!puedeEliminar) return
    update(ref(db, `clientes/${clienteId}`), {
      inactivo: true,
      inactivoDesde: Date.now(),
    })
    onEliminado?.()
  }

  // Suspensión: para clientes que dejaron de venir pero podrían volver.
  // Desaparece de la lista principal, no se le pueden anotar compras nuevas,
  // pero sigue siendo visible y se le pueden registrar pagos con normalidad.
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

        {error && <p className="mensaje-error">{error}</p>}

        {confirmando === 'eliminar' && (
          <div className="confirmacion-borrado">
            <p>¿Seguro que querés eliminar a {cliente.nombre}? Podés restaurarlo después desde "Suspendidos y eliminados".</p>
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
              ¿Suspender a {cliente.nombre}? Deja de aparecer en la lista principal y no se le van a poder anotar
              compras nuevas, pero sí se le pueden seguir registrando pagos. Se puede reactivar cuando quieras.
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
              ¿Reactivar a {cliente.nombre}? Vuelve a aparecer en la lista principal y se le pueden anotar compras
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
