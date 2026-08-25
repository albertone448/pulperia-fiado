import { useState } from 'react'
import { ref, update } from 'firebase/database'
import { db } from '../firebase'

export default function EditClientModal({ clienteId, cliente, onCerrar }) {
  const [nombre, setNombre] = useState(cliente.nombre || '')
  const [telefono, setTelefono] = useState(cliente.telefono || '')
  const [error, setError] = useState('')

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

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-titulo">Editar cliente</h2>

        <label className="campo-label">Nombre completo</label>
        <input className="campo-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />

        <label className="campo-label">Teléfono (opcional)</label>
        <input className="campo-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

        {error && <p className="mensaje-error">{error}</p>}

        <div className="modal-acciones">
          <button className="btn-secundario" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn-primario" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
