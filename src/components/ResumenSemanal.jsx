import { useMemo } from 'react'
import { calcularResumenSemanal } from '../utils/deudas'
import { formatColones } from '../utils/dateUtils'

const ZONA = 'America/Costa_Rica'

function formatDiaMes(timestamp) {
  return new Date(timestamp).toLocaleDateString('es-CR', { timeZone: ZONA, day: 'numeric', month: 'short' })
}

// "3 al 9 nov", o "27 oct al 2 nov" si la semana cruza de mes.
function etiquetaSemana(inicio, fin) {
  const desde = formatDiaMes(inicio)
  const hasta = formatDiaMes(fin - 1)
  const [diaDesde, mesDesde] = desde.split(' ')
  const [, mesHasta] = hasta.split(' ')
  return mesDesde === mesHasta ? `${diaDesde} al ${hasta}` : `${desde} al ${hasta}`
}

export default function ResumenSemanal({ clientes, transacciones }) {
  const { semanas, mismaAltura } = useMemo(
    () => calcularResumenSemanal(clientes, transacciones),
    [clientes, transacciones],
  )

  return (
    <div className="resumen-semanal">
      <h3 className="subtitulo-historial">Por semana</h3>
      <table className="tabla-semanas">
        <thead>
          <tr>
            <th>Semana</th>
            <th>Fiado</th>
            <th>Pagado</th>
            <th>Diferencia</th>
          </tr>
        </thead>
        <tbody>
          {semanas.map((s) => (
            <tr key={s.inicio} className={s.enCurso ? 'semana-en-curso' : undefined}>
              <td>
                {etiquetaSemana(s.inicio, s.fin)}
                {s.enCurso && <span className="semana-etiqueta">en curso</span>}
              </td>
              <td>{formatColones(s.fiado)}</td>
              <td>{formatColones(s.pagado)}</td>
              <td className={s.diferencia > 0 ? 'monto-cargo' : s.diferencia < 0 ? 'monto-pago' : undefined}>
                {s.diferencia > 0 ? '+' : s.diferencia < 0 ? '-' : ''}
                {formatColones(Math.abs(s.diferencia))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="texto-trazabilidad">
        La semana pasada, a esta misma altura: fiado {formatColones(mismaAltura.fiado)}, pagado{' '}
        {formatColones(mismaAltura.pagado)}. La diferencia es cuánto creció (+) o bajó (-) la deuda total. No incluye
        ventas esporádicas.
      </p>
    </div>
  )
}
