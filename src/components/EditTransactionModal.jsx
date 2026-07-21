import { useState } from 'react'
import { ref, update, remove } from 'firebase/database'
import { db } from '../firebase'
import { formatFechaHora } from '../utils/dateUtils'

const METODOS = ['efectivo', 'tarjeta', 'sinpe']

export default function EditTransactionModal({ transaccionId, transaccion, perfilActivo, perfiles, onCerrar }) {
  const esCargo = transaccion.tipo === 'cargo'
  const [descripcion, setDescripcion] = useState(transaccion.descripcion || '')
  const [monto, setMonto] = useState(String(transaccion.monto || ''))
  const [metodos, setMetodos] = useState(
    transaccion.metodos || [{ metodo: 'efectivo', monto: transaccion.monto || '' }]
  )
  const [error, setError] = useState('')
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  function actualizarMetodo(i, campo, valor) {
    setMetodos((prev) => prev.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m)))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const cambios = {
      perfilEditadoId: perfilActivo,
      perfilEditadoNombre: perfiles[perfilActivo]?.nombre || '',
      editadoEn: Date.now(),
    }

    if (esCargo) {
      const montoNum = Number(monto)
      if (!montoNum || montoNum <= 0) {
        setError('Poné un monto válido')
        return
      }
      cambios.descripcion = descripcion.trim() || 'Sin descripción'
      cambios.monto = Math.round(montoNum)
    } else {
      const metodosFinales = metodos
        .filter((m) => Number(m.monto) > 0)
        .map((m) => ({ metodo: m.metodo, monto: Math.round(Number(m.monto)) }))
      const totalNuevo = metodosFinales.reduce((acc, m) => acc + m.monto, 0)
      if (totalNuevo <= 0) {
        setError('Poné al menos un monto válido')
        return
      }
      cambios.metodos = metodosFinales
      cambios.monto = totalNuevo
      cambios.descripcion = metodosFinales.map((m) => m.metodo).join(' + ')
    }

    update(ref(db, `transacciones/${transaccionId}`), cambios)
    onCerrar()
  }

  function handleBorrar() {
    remove(ref(db, `transacciones/${transaccionId}`))
    onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-titulo">{esCargo ? 'Editar fiado' : 'Editar pago'}</h2>
        <p className="texto-trazabilidad">
          Anotado por {transaccion.perfilNombre || 'desconocido'} el {formatFechaHora(transaccion.timestamp)}
        </p>
        {transaccion.editadoEn && (
          <p className="texto-trazabilidad texto-trazabilidad-editado">
            Editado por {transaccion.perfilEditadoNombre} el {formatFechaHora(transaccion.editadoEn)}
          </p>
        )}

        {esCargo ? (
          <>
            <label className="campo-label">¿Qué se llevó?</label>
            <input className="campo-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />

            <label className="campo-label">Monto</label>
            <input
              className="campo-input campo-monto"
              type="number"
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </>
        ) : (
          <>
            {metodos.map((m, i) => (
              <div className="fila-metodo-pago" key={i}>
                <select
                  className="campo-input campo-select"
                  value={m.metodo}
                  onChange={(e) => actualizarMetodo(i, 'metodo', e.target.value)}
                >
                  {METODOS.map((op) => (
                    <option key={op} value={op}>
                      {op.charAt(0).toUpperCase() + op.slice(1)}
                    </option>
                  ))}
                </select>
                <input
                  className="campo-input campo-monto"
                  type="number"
                  inputMode="numeric"
                  value={m.monto}
                  onChange={(e) => actualizarMetodo(i, 'monto', e.target.value)}
                />
              </div>
            ))}
          </>
        )}

        {error && <p className="mensaje-error">{error}</p>}

        {confirmandoBorrado ? (
          <div className="confirmacion-borrado">
            <p>¿Seguro que querés eliminar esta transacción?</p>
            <div className="modal-acciones">
              <button className="btn-secundario" type="button" onClick={() => setConfirmandoBorrado(false)}>
                No
              </button>
              <button className="btn-peligro" type="button" onClick={handleBorrar}>
                Sí, eliminar
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-acciones modal-acciones-tres">
            <button className="btn-peligro-texto" type="button" onClick={() => setConfirmandoBorrado(true)}>
              Eliminar
            </button>
            <button className="btn-secundario" type="button" onClick={onCerrar}>
              Cancelar
            </button>
            <button className="btn-primario" type="submit">
              Guardar
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
