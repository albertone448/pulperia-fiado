import { useMemo } from 'react'
import {
  calcularEstadisticasCliente,
  calcularSaldoMasBajo,
  VENTANAS_SALDO_BAJO,
} from '../utils/deudas'
import { formatColones, formatFechaHora } from '../utils/dateUtils'

export default function ClientStats({ cliente, clienteId, transacciones }) {
  const stats = useMemo(
    () => calcularEstadisticasCliente(transacciones, clienteId),
    [transacciones, clienteId]
  )

  // Si el mínimo es cero o negativo, la cuenta estuvo libre de deuda y eso ya
  // lo cubre "Última vez en cero", así que esa tarjeta no se muestra.
  const saldosBajos = useMemo(
    () =>
      VENTANAS_SALDO_BAJO.map((v) => ({
        ...v,
        minimo: calcularSaldoMasBajo(transacciones, clienteId, v.dias),
      })).filter((v) => v.minimo !== null && v.minimo > 0),
    [transacciones, clienteId]
  )

  return (
    <div className="estadisticas-cliente">
      <h3 className="subtitulo-historial">Estadísticas de este cliente</h3>
      <div className="tarjetas-resumen">
        <div className="tarjeta-resumen">
          <span className="tarjeta-resumen-label">Cliente desde</span>
          <span className="tarjeta-resumen-valor tarjeta-resumen-valor-chica">
            {cliente.creado ? formatFechaHora(cliente.creado) : '—'}
          </span>
        </div>
        <div className="tarjeta-resumen">
          <span className="tarjeta-resumen-label">Última vez en cero</span>
          <span className="tarjeta-resumen-valor tarjeta-resumen-valor-chica">
            {stats.ultimoCero ? formatFechaHora(stats.ultimoCero) : 'Nunca'}
          </span>
        </div>
        {saldosBajos.map((v) => (
          <div key={v.id} className="tarjeta-resumen">
            <span className="tarjeta-resumen-label">Saldo más bajo · {v.etiqueta}</span>
            <span className="tarjeta-resumen-valor">{formatColones(v.minimo)}</span>
          </div>
        ))}
        <div className="tarjeta-resumen">
          <span className="tarjeta-resumen-label">Total fiado histórico</span>
          <span className="tarjeta-resumen-valor">{formatColones(stats.totalFiadoHistorico)}</span>
        </div>
        <div className="tarjeta-resumen">
          <span className="tarjeta-resumen-label">Total pagado histórico</span>
          <span className="tarjeta-resumen-valor">{formatColones(stats.totalPagadoHistorico)}</span>
        </div>
        <div className="tarjeta-resumen">
          <span className="tarjeta-resumen-label">Compras registradas</span>
          <span className="tarjeta-resumen-valor">{stats.cantidadCompras}</span>
        </div>
        <div className="tarjeta-resumen">
          <span className="tarjeta-resumen-label">Pagos registrados</span>
          <span className="tarjeta-resumen-valor">{stats.cantidadPagos}</span>
        </div>
      </div>
    </div>
  )
}
