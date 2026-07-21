import { useState } from 'react'
import { ref, push, update } from 'firebase/database'
import { db } from '../firebase'

export default function NewChargeModal({ clienteId, perfilActivo, perfiles, onCerrar }) {
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Poné un monto válido')
      return
    }
    const nuevoRef = push(ref(db, 'transacciones'))
    update(nuevoRef, {
      clienteId,
      tipo: 'cargo',
      descripcion: descripcion.trim() || 'Sin descripción',
      monto: Math.round(montoNum),
      perfilId: perfilActivo,
      perfilNombre: perfiles[perfilActivo]?.nombre || '',
      timestamp: Date.now(),
    })
    onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-titulo">Anotar fiado</h2>

        <label className="campo-label">¿Qué se llevó?</label>
        <input
          className="campo-input"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej. Pan y leche"
          autoFocus
        />

        <label className="campo-label">Monto</label>
        <input
          className="campo-input campo-monto"
          type="number"
          inputMode="numeric"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0"
        />

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
