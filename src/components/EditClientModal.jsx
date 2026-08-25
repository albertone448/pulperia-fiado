import { useState } from 'react'
import { ref, update } from 'firebase/database'
import { db } from '../firebase'
import { formatColones } from '../utils/dateUtils'

export default function EditClientModal({ clienteId, cliente, deuda, onCerrar, onEliminado }) {
  const [nombre, setNombre] = useState(cliente.nombre || '')
  const [telefono, setTelefono] = useState(cliente.telefono || '')
  const [error, setError] = useState('')
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  const puedeEliminar = deuda === 0

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
  // restaurar después desde "Clientes eliminados".
  function handleEliminar() {
    if (!puedeEliminar) return
    update(ref(db, `clientes/${clienteId}`), {
      inactivo: true,
      inactivoDesde: Date.now(),
    })
    onEliminado?.()
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

        {confirmandoBorrado ? (
          <div className="confirmacion-borrado">
            <p>¿Seguro que querés eliminar a {cliente.nombre}? Podés restaurarlo después desde "Clientes eliminados".</p>
            <div className="modal-acciones">
              <button className="btn-secundario" type="button" onClick={() => setConfirmandoBorrado(false)}>
                No
              </button>
              <button className="btn-peligro" type="button" onClick={handleEliminar}>
                Sí, eliminar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-acciones modal-acciones-tres">
              <button
                className="btn-peligro-texto"
                type="button"
                disabled={!puedeEliminar}
                onClick={() => setConfirmandoBorrado(true)}
              >
                Eliminar cliente
              </button>
              <button className="btn-secundario" type="button" onClick={onCerrar}>
                Cancelar
              </button>
              <button className="btn-primario" type="submit">
                Guardar
              </button>
            </div>
            {!puedeEliminar && (
              <p className="texto-trazabilidad">
                Solo se puede eliminar si el saldo está en cero (debe {formatColones(deuda)}).
              </p>
            )}
          </>
        )}
      </form>
    </div>
  )
}
