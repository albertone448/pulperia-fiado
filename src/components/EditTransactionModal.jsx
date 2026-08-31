import { useState } from 'react'
import { ref, update, remove } from 'firebase/database'
import { db } from '../firebase'
import { formatFechaHora, formatColones } from '../utils/dateUtils'
import { calcularEstadoLimite } from '../utils/deudas'

const METODOS = ['efectivo', 'tarjeta', 'sinpe']

export default function EditTransactionModal({
  transaccionId,
  transaccion,
  clienteId,
  cliente,
  perfilActivo,
  perfiles,
  deudaActual,
  limite,
  onCerrar,
  onCerradoDefinitivo,
}) {
  const esCargo = transaccion.tipo === 'cargo'
  const [descripcion, setDescripcion] = useState(transaccion.descripcion || '')
  const [monto, setMonto] = useState(String(transaccion.monto || ''))
  const [metodos, setMetodos] = useState(
    transaccion.metodos || [{ metodo: 'efectivo', monto: transaccion.monto || '' }]
  )
  const [error, setError] = useState('')
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  // Para saber si el nuevo monto pasa el límite, hay que "sacar" el efecto
  // que tenía el monto original de este mismo cargo antes de sumar el nuevo.
  const montoNumEditado = Number(monto) || 0
  const deudaSinEsteCargo = esCargo ? deudaActual - (transaccion.monto || 0) : deudaActual
  const proyeccion = deudaSinEsteCargo + montoNumEditado
  const { maximoPermitido, excedeLimite, bloqueado } =
    esCargo && limite != null ? calcularEstadoLimite(proyeccion, limite) : { excedeLimite: false, bloqueado: false }
  const mostrarAvisoInformativo = esCargo && montoNumEditado > 0 && excedeLimite && !bloqueado
  const mostrarBloqueo = esCargo && montoNumEditado > 0 && bloqueado

  function actualizarMetodo(i, campo, valor) {
    setMetodos((prev) => prev.map((m, idx) => (idx === i ? { ...m, [campo]: valor } : m)))
  }

  // Una venta esporádica se cierra sola en cuanto su saldo llega a cero, sea
  // por un pago (ver NewPaymentModal) o, como acá, porque se editó o se borró
  // la transacción que la dejaba con saldo pendiente.
  function cerrarSiCorresponde(nuevoSaldo) {
    if (!cliente?.esporadico || nuevoSaldo > 0) return false
    update(ref(db, `clientes/${clienteId}`), { inactivo: true, inactivoDesde: Date.now() })
    return true
  }

  function cerrarPantalla(seCerro) {
    if (seCerro && onCerradoDefinitivo) {
      onCerradoDefinitivo()
    } else {
      onCerrar()
    }
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
      if (bloqueado) {
        setError('Este monto no se puede guardar, pasa el límite permitido para este cliente.')
        return
      }
      cambios.descripcion = descripcion.trim() || ''
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

    // Saldo que va a quedar después de este cambio: se le quita el efecto
    // que tenía la transacción original y se le suma el efecto del nuevo
    // monto ya guardado arriba.
    const nuevoSaldo = esCargo
      ? deudaActual - (transaccion.monto || 0) + cambios.monto
      : deudaActual + (transaccion.monto || 0) - cambios.monto
    cerrarPantalla(cerrarSiCorresponde(nuevoSaldo))
  }

  function handleBorrar() {
    remove(ref(db, `transacciones/${transaccionId}`))
    const nuevoSaldo = esCargo ? deudaActual - (transaccion.monto || 0) : deudaActual + (transaccion.monto || 0)
    cerrarPantalla(cerrarSiCorresponde(nuevoSaldo))
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
            <label className="campo-label">Monto</label>
            <input
              className="campo-input campo-monto"
              type="number"
              inputMode="numeric"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />

            {mostrarAvisoInformativo && (
              <p className="alerta-limite-inline">
                Con este monto el cliente quedaría debiendo {formatColones(proyeccion)}, que pasa su límite de{' '}
                {formatColones(limite)}. Todavía está dentro del margen permitido, se puede guardar igual.
              </p>
            )}

            {mostrarBloqueo && (
              <p className="alerta-limite-bloqueada">
                Con este monto el cliente quedaría debiendo {formatColones(proyeccion)}, que pasa el máximo
                permitido de {formatColones(maximoPermitido)} (límite + margen). No se puede guardar así.
              </p>
            )}

            <label className="campo-label">Nota (opcional)</label>
            <input className="campo-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
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
            <button className="btn-primario" type="submit" disabled={mostrarBloqueo}>
              Guardar
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
