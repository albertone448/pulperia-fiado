// Costa Rica es siempre UTC-6, sin horario de verano, así que no hay que
// preocuparse por cambios de horario en el año.
const TIMEZONE = 'America/Costa_Rica'

// Recibe un timestamp (milisegundos, lo que da Date.now()) y devuelve
// un texto tipo "18 jul 2026, 2:45 p.m."
export function formatFechaHora(timestamp) {
  const fecha = new Date(timestamp)
  const fechaTexto = fecha.toLocaleDateString('es-CR', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const horaTexto = fecha.toLocaleTimeString('es-CR', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${fechaTexto}, ${horaTexto}`
}

// Solo la hora, para listas donde ya se sabe el día (ej. resumen del día)
export function formatHora(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-CR', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// Devuelve el string "YYYY-MM-DD" correspondiente a un timestamp,
// pero calculado en hora de Costa Rica (no en la hora del navegador).
export function toFechaCR(timestamp) {
  const fecha = new Date(timestamp)
  // en-CA da el formato YYYY-MM-DD directo, es un truco práctico
  return fecha.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

// Devuelve el string "YYYY-MM-DD" de hoy, en hora de Costa Rica.
export function hoyFechaCR() {
  return toFechaCR(Date.now())
}

// Formatea un número entero como colones: 15000 -> "₡15,000"
export function formatColones(monto) {
  const numero = Math.round(monto || 0)
  return '₡' + numero.toLocaleString('es-CR')
}
