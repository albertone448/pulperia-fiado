import { useMemo, useState } from 'react'
import { hoyFechaCR, toFechaCR, formatHora, formatColones } from '../utils/dateUtils'
import { construirTicketResumenDia, construirTicketResumenSimple, copiarParaWhatsApp } from '../utils/ticket'

export default function DailySummary({ clientes, transacciones, perfiles }) {
  const [fecha, setFecha] = useState(hoyFechaCR())
  const [copiado, setCopiado] = useState(false)
  const [modoImpresion, setModoImpresion] = useState('simple') // 'simple' | 'detallado'

  const transaccionesDelDia = useMemo(() => {
    return Object.entries(transacciones || {})
      .filter(([, t]) => toFechaCR(t.timestamp) === fecha)
      .sort(([, a], [, b]) => b.timestamp - a.timestamp)
  }, [transacciones, fecha])

  const totales = useMemo(() => {
    let totalFiado = 0
    let porMetodo = { efectivo: 0, tarjeta: 0, sinpe: 0 }
    let totalPagos = 0

    for (const [, t] of transaccionesDelDia) {
      if (t.tipo === 'cargo') {
        totalFiado += Number(t.monto) || 0
      } else if (t.tipo === 'pago') {
        totalPagos += Number(t.monto) || 0
        for (const m of t.metodos || []) {
          porMetodo[m.metodo] = (porMetodo[m.metodo] || 0) + Number(m.monto || 0)
        }
      }
    }
    return { totalFiado, porMetodo, totalPagos }
  }, [transaccionesDelDia])

  const fechaTextoLarga = new Date(fecha + 'T12:00:00').toLocaleDateString('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const textoTicketDetallado = construirTicketResumenDia({
    fechaTexto: fechaTextoLarga,
    totales,
    movimientos: transaccionesDelDia,
    clientes,
  })

  const textoTicketSimple = construirTicketResumenSimple({
    fechaTexto: fechaTextoLarga,
    totales,
  })

  const textoParaImprimir = modoImpresion === 'simple' ? textoTicketSimple : textoTicketDetallado

  function imprimir(modo) {
    setModoImpresion(modo)
    setTimeout(() => window.print(), 50)
  }

  async function handleCopiar() {
    const ok = await copiarParaWhatsApp(textoTicketDetallado)
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  return (
    <div className="contenedor">
      <div className="barra-superior">
        <label className="campo-label">Fecha</label>
        <input className="campo-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>

      <div className="acciones-cliente">
        <button className="btn-secundario" type="button" onClick={() => imprimir('simple')}>
          Imprimir totales
        </button>
        <button className="btn-secundario" type="button" onClick={() => imprimir('detallado')}>
          Imprimir todo
        </button>
      </div>
      <div className="acciones-cliente">
        <button className="btn-secundario" type="button" onClick={handleCopiar}>
          {copiado ? 'Copiado ✓' : 'Copiar para WhatsApp'}
        </button>
      </div>

      <div className="tarjetas-resumen">
        <div className="tarjeta-resumen tarjeta-resumen-destacada">
          <span className="tarjeta-resumen-label">Fiado hoy</span>
          <span className="tarjeta-resumen-valor">{formatColones(totales.totalFiado)}</span>
        </div>
        <div className="tarjeta-resumen">
          <span className="tarjeta-resumen-label">Efectivo</span>
          <span className="tarjeta-resumen-valor">{formatColones(totales.porMetodo.efectivo)}</span>
        </div>
        <div className="tarjeta-resumen">
          <span className="tarjeta-resumen-label">Tarjeta</span>
          <span className="tarjeta-resumen-valor">{formatColones(totales.porMetodo.tarjeta)}</span>
        </div>
        <div className="tarjeta-resumen">
          <span className="tarjeta-resumen-label">Sinpe</span>
          <span className="tarjeta-resumen-valor">{formatColones(totales.porMetodo.sinpe)}</span>
        </div>
      </div>

      <h3 className="subtitulo-historial">Movimientos del día</h3>
      <div className="lista-historial">
        {transaccionesDelDia.length === 0 && (
          <p className="texto-vacio">No hay movimientos en esta fecha.</p>
        )}
        {transaccionesDelDia.map(([id, t]) => (
          <div key={id} className="fila-historial fila-historial-sin-click">
            <div className="fila-historial-info">
              <span className="fila-historial-desc">
                {clientes[t.clienteId]?.nombre || 'Cliente eliminado'} ·{' '}
                {t.descripcion?.trim() ? t.descripcion : t.tipo === 'cargo' ? 'Compra' : 'Pago'}
              </span>
              <span className="fila-historial-fecha">
                {formatHora(t.timestamp)} · {t.perfilNombre}
              </span>
            </div>
            <span className={t.tipo === 'cargo' ? 'monto-cargo' : 'monto-pago'}>
              {t.tipo === 'cargo' ? '+' : '-'}
              {formatColones(t.monto)}
            </span>
          </div>
        ))}
      </div>

      <pre className="ticket-print-area">{textoParaImprimir}</pre>
    </div>
  )
}
