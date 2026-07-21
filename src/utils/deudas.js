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
