import { useMemo, useState } from 'react'
import { calcularClientesSinPagar, calcularClientesPorUltimoCero, calcularDeuda } from '../utils/deudas'
import { formatColones } from '../utils/dateUtils'

// Cada criterio de orden vive acá. Para agregar uno nuevo en el futuro,
// solo hay que sumar un objeto más a esta lista, no hay que tocar el resto
// de la pantalla.
const CRITERIOS = [
  {
    id: 'sinPagar',
    etiqueta: 'Tiempo sin pagar',
    etiquetaPromedio: 'Promedio de días sin pagar',
    calcular: (clientes, transacciones) =>
      calcularClientesSinPagar(clientes, transacciones).map((r) => ({
        ...r,
        detalle: r.ultimoPago ? `${r.dias} días sin pagar` : `Nunca ha pagado (${r.dias} días)`,
      })),
  },
  {
    id: 'sinCero',
    etiqueta: 'Tiempo sin dejar la cuenta en cero',
    etiquetaPromedio: 'Promedio de días sin llegar a cero',
    calcular: (clientes, transacciones) =>
      calcularClientesPorUltimoCero(clientes, transacciones).map((r) => ({
        ...r,
        detalle: r.ultimoCero ? `${r.dias} días sin dejarla en cero` : `Nunca la ha dejado en cero (${r.dias} días)`,
      })),
  },
]

export default function Statistics({ clientes, transacciones, onAbrirCliente }) {
  const [criterioId, setCriterioId] = useState(CRITERIOS[0].id)
  const [orden, setOrden] = useState('desc') // 'desc' = más días primero, 'asc' = menos días primero
  const criterio = CRITERIOS.find((c) => c.id === criterioId) || CRITERIOS[0]

  // Los clientes suspendidos se sacan del ranking principal: ya se sabe que no
  // están pagando, así que no aportan nada a "detectar algo inusual" entre los
  // activos. Su deuda se muestra aparte, sin mezclarse en el orden ni el promedio.
  // Las ventas esporádicas tampoco entran: son tickets puntuales, no clientes
  // habituales, y ya son bien visibles desde la lista principal.
  const clientesActivos = useMemo(() => {
    return Object.fromEntries(
      Object.entries(clientes || {}).filter(([, cliente]) => !cliente.suspendido && !cliente.esporadico)
    )
  }, [clientes])

  const ranking = useMemo(() => {
    const lista = criterio.calcular(clientesActivos, transacciones)
    return orden === 'asc' ? [...lista].reverse() : lista
  }, [criterio, clientesActivos, transacciones, orden])

  const promedioDias = useMemo(() => {
    if (ranking.length === 0) return 0
    const suma = ranking.reduce((acc, r) => acc + r.dias, 0)
    return Math.round(suma / ranking.length)
  }, [ranking])

  const suspendidosConDeuda = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => cliente.suspendido)
      .map(([id, cliente]) => ({ id, cliente, deuda: calcularDeuda(transacciones, id) }))
      .filter((c) => c.deuda > 0)
      .sort((a, b) => b.deuda - a.deuda)
  }, [clientes, transacciones])

  return (
    <div className="contenedor">
      <div className="tarjetas-resumen">
        <div className="tarjeta-resumen tarjeta-resumen-destacada">
          <span className="tarjeta-resumen-label">Clientes con deuda pendiente</span>
          <span className="tarjeta-resumen-valor">{ranking.length}</span>
        </div>
        <div className="tarjeta-resumen tarjeta-resumen-destacada">
          <span className="tarjeta-resumen-label">{criterio.etiquetaPromedio}</span>
          <span className="tarjeta-resumen-valor">{promedioDias}</span>
        </div>
      </div>

      <div className="selector-criterio">
        <label className="campo-label">Ordenar por</label>
        <div className="selector-criterio-fila">
          <select
            className="campo-input campo-select campo-select-ancho"
            value={criterioId}
            onChange={(e) => setCriterioId(e.target.value)}
          >
            {CRITERIOS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.etiqueta}
              </option>
            ))}
          </select>
          <button
            className="btn-orden"
            type="button"
            onClick={() => setOrden((o) => (o === 'desc' ? 'asc' : 'desc'))}
            title={orden === 'desc' ? 'De más a menos días' : 'De menos a más días'}
          >
            {orden === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      <div className="lista-historial">
        {ranking.length === 0 && (
          <p className="texto-vacio">No hay clientes debiendo en este momento.</p>
        )}
        {ranking.map(({ id, cliente, deuda, detalle }) => (
          <button key={id} className="fila-historial" onClick={() => onAbrirCliente(id)}>
            <div className="fila-historial-info">
              <span className="fila-historial-desc">{cliente.nombre}</span>
              <span className="fila-historial-fecha">{detalle}</span>
            </div>
            <span className="monto-deuda">{formatColones(deuda)}</span>
          </button>
        ))}
      </div>

      {suspendidosConDeuda.length > 0 && (
        <>
          <h3 className="subtitulo-historial">Clientes suspendidos con saldo pendiente</h3>
          <div className="lista-historial">
            {suspendidosConDeuda.map(({ id, cliente, deuda }) => (
              <button key={id} className="fila-historial" onClick={() => onAbrirCliente(id)}>
                <div className="fila-historial-info">
                  <span className="fila-historial-desc">{cliente.nombre}</span>
                </div>
                <span className="monto-deuda">{formatColones(deuda)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
