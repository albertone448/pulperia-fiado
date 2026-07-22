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
