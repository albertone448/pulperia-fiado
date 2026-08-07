import { useState } from 'react'
import { ref, push, update } from 'firebase/database'
import { db } from '../firebase'
import { formatColones } from '../utils/dateUtils'
import { calcularEstadoLimite } from '../utils/deudas'

export default function NewChargeModal({ clienteId, perfilActivo, perfiles, deudaActual, limite, onCerrar }) {
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')

  const montoNum = Number(monto) || 0
  const proyeccion = deudaActual + montoNum
  const { maximoPermitido, excedeLimite, bloqueado } = calcularEstadoLimite(proyeccion, limite)

  const mostrarAvisoInformativo = montoNum > 0 && excedeLimite && !bloqueado
  const mostrarBloqueo = montoNum > 0 && bloqueado

  function handleSubmit(e) {
    e.preventDefault()
    if (!montoNum || montoNum <= 0) {
      setError('Poné un monto válido')
      return
    }
    if (bloqueado) {
      setError('Este monto no se puede guardar, pasa el límite permitido para este cliente.')
      return
    }
    const nuevoRef = push(ref(db, 'transacciones'))
    update(nuevoRef, {
      clienteId,
      tipo: 'cargo',
      descripcion: nota.trim() || '',
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
        <h2 className="modal-titulo">Anotar compra</h2>

        <label className="campo-label">Monto</label>
        <input
          className="campo-input campo-monto"
          type="number"
          inputMode="numeric"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0"
          autoFocus
        />

        {mostrarAvisoInformativo && (
          <p className="alerta-limite-inline">
            Con este monto el cliente quedaría debiendo {formatColones(proyeccion)}, que pasa su límite de{' '}
            {formatColones(limite)}. Todavía está dentro del margen permitido, se puede guardar igual.
          </p>
        )}

        {mostrarBloqueo && (
          <p className="alerta-limite-bloqueada">
            Con este monto el cliente quedaría debiendo {formatColones(proyeccion)}, que pasa el máximo permitido de{' '}
            {formatColones(maximoPermitido)} (límite + margen). No se puede guardar así, bajá el monto o subí el
            límite del cliente si corresponde.
          </p>
        )}

        <label className="campo-label">Nota (opcional)</label>
        <input
          className="campo-input"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej. pan y leche"
        />

        {error && <p className="mensaje-error">{error}</p>}

        <div className="modal-acciones">
          <button className="btn-secundario" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn-primario" type="submit" disabled={mostrarBloqueo}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
