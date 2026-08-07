// Calcula cuánto debe un cliente sumando sus cargos y restando sus pagos.
export function calcularDeuda(transacciones, clienteId) {
  let total = 0
  for (const t of Object.values(transacciones || {})) {
    if (t.clienteId !== clienteId) continue
    if (t.tipo === 'cargo') total += Number(t.monto) || 0
    if (t.tipo === 'pago') total -= Number(t.monto) || 0
  }
  return total
}

// Devuelve las transacciones de un cliente, ordenadas de más reciente a más vieja.
export function transaccionesDeCliente(transacciones, clienteId) {
  return Object.entries(transacciones || {})
    .filter(([, t]) => t.clienteId === clienteId)
    .sort(([, a], [, b]) => b.timestamp - a.timestamp)
}

// Devuelve el timestamp del pago más reciente de un cliente, o null si nunca ha pagado.
export function calcularUltimoPago(transacciones, clienteId) {
  let ultimo = null
  for (const t of Object.values(transacciones || {})) {
    if (t.clienteId !== clienteId || t.tipo !== 'pago') continue
    if (!ultimo || t.timestamp > ultimo) ultimo = t.timestamp
  }
  return ultimo
}

// El margen de tolerancia sobre el límite de crédito antes de bloquear de verdad.
// Ej: límite 100,000 con 5% de margen deja pasar hasta 105,000 con solo un aviso.
export const MARGEN_LIMITE = 0.05

export function calcularEstadoLimite(deudaProyectada, limite) {
  const maximoPermitido = limite * (1 + MARGEN_LIMITE)
  const excedeLimite = deudaProyectada > limite
  const bloqueado = deudaProyectada > maximoPermitido
  return { maximoPermitido, excedeLimite, bloqueado }
}

// Ranking de clientes que deben algo, ordenados por más tiempo sin pagar primero.
// Si un cliente nunca ha pagado, se cuenta desde que fue creado.
// Los clientes con deuda 0 no aparecen (no tiene sentido "tiempo sin pagar" si no deben nada).
export function calcularClientesSinPagar(clientes, transacciones) {
  const ahora = Date.now()
  return Object.entries(clientes || {})
    .map(([id, cliente]) => {
      const deuda = calcularDeuda(transacciones, id)
      if (deuda <= 0) return null
      const ultimoPago = calcularUltimoPago(transacciones, id)
      const fechaBase = ultimoPago || cliente.creado || ahora
      const dias = Math.floor((ahora - fechaBase) / (1000 * 60 * 60 * 24))
      return { id, cliente, deuda, ultimoPago, dias }
    })
    .filter(Boolean)
    .sort((a, b) => b.dias - a.dias)
}

// Estadísticas propias de un solo cliente, para mostrar en su ficha.
export function calcularEstadisticasCliente(transacciones, clienteId) {
  const historialAsc = Object.values(transacciones || {})
    .filter((t) => t.clienteId === clienteId)
    .sort((a, b) => a.timestamp - b.timestamp)

  let saldo = 0
  let ultimoCero = null
  let totalFiadoHistorico = 0
  let totalPagadoHistorico = 0
  let cantidadCompras = 0
  let cantidadPagos = 0

  for (const t of historialAsc) {
    if (t.tipo === 'cargo') {
      saldo += Number(t.monto) || 0
      totalFiadoHistorico += Number(t.monto) || 0
      cantidadCompras += 1
    } else if (t.tipo === 'pago') {
      saldo -= Number(t.monto) || 0
      totalPagadoHistorico += Number(t.monto) || 0
      cantidadPagos += 1
    }
    if (saldo === 0) ultimoCero = t.timestamp
  }

  const primerMovimiento = historialAsc[0]?.timestamp || null
  const ultimoMovimiento = historialAsc[historialAsc.length - 1]?.timestamp || null

  return {
    ultimoCero,
    totalFiadoHistorico,
    totalPagadoHistorico,
    cantidadCompras,
    cantidadPagos,
    primerMovimiento,
    ultimoMovimiento,
  }
}
