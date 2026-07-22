import { formatColones, formatFechaHora, formatHora } from './dateUtils'

const ANCHO = 32 // ancho típico de una impresora de facturero angosta
const LINEA = '-'.repeat(ANCHO)

// Arma una fila con texto a la izquierda y un valor a la derecha, tipo tiquete.
// Si no cabe todo en el ancho, igual no se corta el texto (mejor que perder info).
function fila(izquierda, derecha) {
  const espacio = ANCHO - izquierda.length - derecha.length
  if (espacio > 0) return izquierda + ' '.repeat(espacio) + derecha
  return izquierda + ' ' + derecha
}

function centrado(texto) {
  const espacio = Math.max(0, Math.floor((ANCHO - texto.length) / 2))
  return ' '.repeat(espacio) + texto
}

// ---------- Resumen del día: solo totales, para no gastar papel ----------

export function construirTicketResumenSimple({ fechaTexto, totales }) {
  const lineas = []
  lineas.push(centrado('MINISUPER EL PUENTE'))
  lineas.push(centrado('Resumen del dia'))
  lineas.push(centrado(fechaTexto))
  lineas.push(LINEA)
  lineas.push(fila('Fiado hoy:', formatColones(totales.totalFiado)))
  lineas.push(LINEA)
  lineas.push('PAGOS RECIBIDOS')
  lineas.push(fila('Efectivo:', formatColones(totales.porMetodo.efectivo)))
  lineas.push(fila('Tarjeta:', formatColones(totales.porMetodo.tarjeta)))
  lineas.push(fila('Sinpe:', formatColones(totales.porMetodo.sinpe)))
  lineas.push(fila('Total pagos:', formatColones(totales.totalPagos)))
  lineas.push(LINEA)
  lineas.push(centrado(new Date().toLocaleString('es-CR')))
  return lineas.join('\n')
}

// ---------- Resumen del día: detallado, ventas primero y pagos después (no revueltos) ----------

export function construirTicketResumenDia({ fechaTexto, totales, movimientos, clientes }) {
  const lineas = []
  lineas.push(centrado('MINISUPER EL PUENTE'))
  lineas.push(centrado('Resumen del dia'))
  lineas.push(centrado(fechaTexto))
  lineas.push(LINEA)
  lineas.push(fila('Fiado hoy:', formatColones(totales.totalFiado)))
  lineas.push(LINEA)
  lineas.push('PAGOS RECIBIDOS')
  lineas.push(fila('Efectivo:', formatColones(totales.porMetodo.efectivo)))
  lineas.push(fila('Tarjeta:', formatColones(totales.porMetodo.tarjeta)))
  lineas.push(fila('Sinpe:', formatColones(totales.porMetodo.sinpe)))
  lineas.push(fila('Total pagos:', formatColones(totales.totalPagos)))
  lineas.push(LINEA)

  const ventas = movimientos.filter(([, t]) => t.tipo === 'cargo')
  const pagos = movimientos.filter(([, t]) => t.tipo === 'pago')

  lineas.push('VENTAS (fiado)')
  if (ventas.length === 0) {
    lineas.push('(sin ventas)')
  }
  for (const [, t] of ventas) {
    const nombre = clientes[t.clienteId]?.nombre || 'Cliente eliminado'
    lineas.push(`${formatHora(t.timestamp)}  ${nombre}`)
    lineas.push(fila('  ' + (t.descripcion?.trim() || 'Compra'), '+' + formatColones(t.monto)))
  }

  lineas.push(LINEA)
  lineas.push('PAGOS')
  if (pagos.length === 0) {
    lineas.push('(sin pagos)')
  }
  for (const [, t] of pagos) {
    const nombre = clientes[t.clienteId]?.nombre || 'Cliente eliminado'
    lineas.push(`${formatHora(t.timestamp)}  ${nombre}`)
    lineas.push(fila('  ' + (t.descripcion?.trim() || 'Pago'), '-' + formatColones(t.monto)))
  }

  lineas.push(LINEA)
  lineas.push(centrado(new Date().toLocaleString('es-CR')))
  return lineas.join('\n')
}

// ---------- Detalle de un cliente ----------

export function construirTicketCliente({ cliente, deuda, limite, historial }) {
  const lineas = []
  lineas.push(centrado('MINISUPER EL PUENTE'))
  lineas.push(centrado(cliente.nombre))
  if (cliente.telefono) lineas.push(centrado(cliente.telefono))
  lineas.push(LINEA)
  lineas.push(fila('DEBE:', formatColones(deuda)))
  lineas.push(fila('Limite:', formatColones(limite)))
  lineas.push(LINEA)
  lineas.push('HISTORIAL (mas reciente primero)')
  if (historial.length === 0) {
    lineas.push('(sin movimientos)')
  }
  for (const [, t] of historial) {
    const signo = t.tipo === 'cargo' ? '+' : '-'
    lineas.push(formatFechaHora(t.timestamp))
    lineas.push(fila('  ' + (t.descripcion?.trim() || (t.tipo === 'cargo' ? 'Compra' : 'Pago')), signo + formatColones(t.monto)))
  }
  lineas.push(LINEA)
  lineas.push(centrado(new Date().toLocaleString('es-CR')))
  return lineas.join('\n')
}

// Copia texto al portapapeles. Envuelto en ``` para que WhatsApp lo muestre
// con fuente monoespaciada y no se desalineen los montos.
export async function copiarParaWhatsApp(texto) {
  const textoFormateado = '```\n' + texto + '\n```'
  try {
    await navigator.clipboard.writeText(textoFormateado)
    return true
  } catch {
    return false
  }
}
