import { useState } from 'react'
import { ref, push, update } from 'firebase/database'
import { db } from '../firebase'

const METODOS = ['efectivo', 'tarjeta', 'sinpe']

export default function NewPaymentModal({ clienteId, perfilActivo, perfiles, onCerrar }) {
  const [filas, setFilas] = useState([{ metodo: 'efectivo', monto: '' }])
  const [error, setError] = useState('')

  function actualizarFila(i, campo, valor) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)))
  }

  function agregarFila() {
    const usados = filas.map((f) => f.metodo)
    const disponible = METODOS.find((m) => !usados.includes(m)) || METODOS[0]
    setFilas((prev) => [...prev, { metodo: disponible, monto: '' }])
  }

  function quitarFila(i) {
    setFilas((prev) => prev.filter((_, idx) => idx !== i))
  }

  const total = filas.reduce((acc, f) => acc + (Number(f.monto) || 0), 0)

  function handleSubmit(e) {
    e.preventDefault()
    if (total <= 0) {
      setError('Poné al menos un monto válido')
      return
    }
    const metodosFinales = filas
      .filter((f) => Number(f.monto) > 0)
      .map((f) => ({ metodo: f.metodo, monto: Math.round(Number(f.monto)) }))

    const nuevoRef = push(ref(db, 'transacciones'))
    update(nuevoRef, {
      clienteId,
      tipo: 'pago',
      descripcion: metodosFinales.map((m) => m.metodo).join(' + '),
      monto: Math.round(total),
      metodos: metodosFinales,
      perfilId: perfilActivo,
      perfilNombre: perfiles[perfilActivo]?.nombre || '',
      timestamp: Date.now(),
    })
    onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-titulo">Registrar pago</h2>

        {filas.map((fila, i) => (
          <div className="fila-metodo-pago" key={i}>
            <select
              className="campo-input campo-select"
              value={fila.metodo}
              onChange={(e) => actualizarFila(i, 'metodo', e.target.value)}
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
            <input
              className="campo-input campo-monto"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={fila.monto}
              onChange={(e) => actualizarFila(i, 'monto', e.target.value)}
            />
            {filas.length > 1 && (
              <button type="button" className="btn-quitar-fila" onClick={() => quitarFila(i)}>
                &times;
              </button>
            )}
          </div>
        ))}

        {filas.length < METODOS.length && (
          <button type="button" className="btn-link" onClick={agregarFila}>
            + Agregar otro método de pago
          </button>
        )}

        <p className="texto-total-pago">Total: {total.toLocaleString('es-CR')}</p>

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
