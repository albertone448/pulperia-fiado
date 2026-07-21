import { useState, useMemo } from 'react'
import { ref, push, update } from 'firebase/database'
import { db } from '../firebase'
import { calcularDeuda } from '../utils/deudas'
import { formatColones } from '../utils/dateUtils'

const LIMITE_DEFAULT = 50000

export default function ClientList({ clientes, transacciones, onAbrirCliente }) {
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)

  const listaOrdenada = useMemo(() => {
    return Object.entries(clientes || {})
      .map(([id, cliente]) => ({
        id,
        cliente,
        deuda: calcularDeuda(transacciones, id),
      }))
      .filter(({ cliente }) =>
        cliente.nombre?.toLowerCase().includes(busqueda.toLowerCase().trim())
      )
      .sort((a, b) => b.deuda - a.deuda)
  }, [clientes, transacciones, busqueda])

  const totalGeneral = listaOrdenada.reduce((acc, c) => acc + c.deuda, 0)

  return (
    <div className="contenedor">
      <div className="barra-superior">
        <input
          className="campo-input campo-busqueda"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button className="btn-primario btn-ancho-fijo" onClick={() => setCreando(true)}>
          + Cliente
        </button>
      </div>

      <div className="resumen-total-general">
        Total fiado: <strong>{formatColones(totalGeneral)}</strong>
      </div>

      <div className="lista-clientes">
        {listaOrdenada.length === 0 && (
          <p className="texto-vacio">No hay clientes todavía. Creá el primero.</p>
        )}
        {listaOrdenada.map(({ id, cliente, deuda }) => (
          <button key={id} className="fila-cliente" onClick={() => onAbrirCliente(id)}>
            <div className="fila-cliente-info">
              <span className="fila-cliente-nombre">{cliente.nombre}</span>
              {cliente.telefono && <span className="fila-cliente-telefono">{cliente.telefono}</span>}
            </div>
            <div className="fila-cliente-derecha">
              <span className={deuda > (cliente.limite ?? LIMITE_DEFAULT) ? 'monto-deuda monto-deuda-excedido' : 'monto-deuda'}>
                {formatColones(deuda)}
              </span>
              {deuda > (cliente.limite ?? LIMITE_DEFAULT) && (
                <span className="etiqueta-alerta">Pasó el límite</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {creando && <NuevoCliente onCerrar={() => setCreando(false)} />}
    </div>
  )
}

function NuevoCliente({ onCerrar }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [limite, setLimite] = useState(String(LIMITE_DEFAULT))
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (nombre.trim().length < 2) {
      setError('Poné el nombre del cliente')
      return
    }
    const nuevoRef = push(ref(db, 'clientes'))
    update(nuevoRef, {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      limite: Number(limite) || LIMITE_DEFAULT,
      creado: Date.now(),
    })
    onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-titulo">Nuevo cliente</h2>

        <label className="campo-label">Nombre completo</label>
        <input className="campo-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />

        <label className="campo-label">Teléfono (opcional)</label>
        <input className="campo-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

        <label className="campo-label">Límite de crédito</label>
        <input
          className="campo-input"
          type="number"
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
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
