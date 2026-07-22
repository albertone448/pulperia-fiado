import { useMemo } from 'react'
import { calcularClientesSinPagar } from '../utils/deudas'
import { formatColones } from '../utils/dateUtils'

export default function Statistics({ clientes, transacciones, onAbrirCliente }) {
  const ranking = useMemo(
    () => calcularClientesSinPagar(clientes, transacciones),
    [clientes, transacciones]
  )

  const promedioDias = useMemo(() => {
    if (ranking.length === 0) return 0
    const suma = ranking.reduce((acc, r) => acc + r.dias, 0)
    return Math.round(suma / ranking.length)
  }, [ranking])

  return (
    <div className="contenedor">
      <div className="tarjetas-resumen">
        <div className="tarjeta-resumen tarjeta-resumen-destacada">
          <span className="tarjeta-resumen-label">Clientes con deuda pendiente</span>
          <span className="tarjeta-resumen-valor">{ranking.length}</span>
        </div>
        <div className="tarjeta-resumen tarjeta-resumen-destacada">
          <span className="tarjeta-resumen-label">Promedio de dias sin pagar</span>
          <span className="tarjeta-resumen-valor">{promedioDias}</span>
        </div>
      </div>

      <h3 className="subtitulo-historial">Más tiempo sin pagar</h3>
      <div className="lista-historial">
        {ranking.length === 0 && (
          <p className="texto-vacio">No hay clientes debiendo en este momento.</p>
        )}
        {ranking.map(({ id, cliente, deuda, dias, ultimoPago }) => (
          <button key={id} className="fila-historial" onClick={() => onAbrirCliente(id)}>
            <div className="fila-historial-info">
              <span className="fila-historial-desc">{cliente.nombre}</span>
              <span className="fila-historial-fecha">
                {ultimoPago ? `${dias} dias sin pagar` : `Nunca ha pagado (${dias} dias)`}
              </span>
            </div>
            <span className="monto-deuda">{formatColones(deuda)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
