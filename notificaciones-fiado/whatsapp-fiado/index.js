require('dotenv').config()
const path = require('path')
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const admin = require('firebase-admin')
const pino = require('pino')

// ---------- Firebase ----------

const credencialesPath = process.env.FIREBASE_CREDENTIALS_PATH || './firebase-credenciales.json'

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(credencialesPath))),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
})

const db = admin.database()

// ---------- Utilidades ----------

// Formatea un monto entero como colones con comas: 15000 -> "₡15,000"
function formatColones(monto) {
  const numero = Math.round(monto || 0)
  return '₡' + numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Limpia el teléfono guardado y le agrega el 506 si hace falta.
// Acepta el número solo (8 digitos) o ya con 506 incluido, con o sin
// espacios/guiones/simbolo +. Si no calza con ningun formato conocido,
// devuelve null (y ese cliente simplemente no recibe el mensaje).
function normalizarTelefono(raw) {
  if (!raw) return null
  const limpio = String(raw).replace(/\D/g, '')
  if (limpio.length === 8) return '506' + limpio
  if (limpio.length === 11 && limpio.startsWith('506')) return limpio
  return null
}

// Suma cargos y resta pagos para saber el saldo actual de un cliente.
async function calcularSaldo(clienteId) {
  const snap = await db.ref('transacciones').orderByChild('clienteId').equalTo(clienteId).once('value')
  let saldo = 0
  snap.forEach((child) => {
    const t = child.val()
    if (t.tipo === 'cargo') saldo += Number(t.monto) || 0
    if (t.tipo === 'pago') saldo -= Number(t.monto) || 0
  })
  return saldo
}

function mensajeFiado(nombre, monto, saldo) {
  return `Hola ${nombre} 👋 Se te registró una nueva compra de ${formatColones(monto)} en Minisúper El Puente. Tu nuevo saldo es de ${formatColones(saldo)}.`
}

function mensajePago(nombre, monto, saldo) {
  if (saldo <= 0) {
    return `Hola ${nombre} 👋 Se registró tu pago de ${formatColones(monto)} en Minisúper El Puente. ¡Tu cuenta quedó al día! 🎉`
  }
  return `Hola ${nombre} 👋 Se registró tu pago de ${formatColones(monto)} en Minisúper El Puente. Tu nuevo saldo es de ${formatColones(saldo)}.`
}

// ---------- WhatsApp ----------

let sock = null
let escuchando = false // evita registrar el listener de Firebase más de una vez si se reconecta

async function iniciarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info')

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }), // no necesitamos ver el detalle interno de Baileys
    syncFullHistory: false, // no nos interesan los chats viejos, solo transacciones nuevas
    shouldSyncHistoryMessage: () => false, // rechaza los envios de historial que manda WhatsApp
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('\nEscaneá este código QR con el WhatsApp del número dedicado del súper:')
      console.log('(WhatsApp > Configuración > Dispositivos vinculados > Vincular un dispositivo)\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const motivo = lastDisconnect?.error?.output?.statusCode
      const debeReconectar = motivo !== DisconnectReason.loggedOut
      console.log('Se cerró la conexión con WhatsApp. ¿Va a reconectar solo?', debeReconectar)
      if (debeReconectar) {
        iniciarWhatsApp()
      } else {
        console.log(
          'La sesión se cerró desde el teléfono (logout). Borrá la carpeta "auth_info" y volvé a arrancar el programa para escanear el QR de nuevo.'
        )
      }
    } else if (connection === 'open') {
      console.log('Conectado a WhatsApp correctamente.')
      escucharTransacciones()
    }
  })
}

// ---------- Escuchar transacciones nuevas en Firebase ----------

function escucharTransacciones() {
  if (escuchando) return
  escuchando = true

  const desde = Date.now()
  console.log('Escuchando fiados y pagos nuevos a partir de ahora...')

  db.ref('transacciones')
    .orderByChild('timestamp')
    .startAt(desde)
    .on('child_added', async (snapshot) => {
      try {
        const t = snapshot.val()
        if (!t || !t.clienteId) return
        if (t.tipo !== 'cargo' && t.tipo !== 'pago') return

        const clienteSnap = await db.ref('clientes/' + t.clienteId).once('value')
        const cliente = clienteSnap.val()
        if (!cliente || !cliente.telefono) return // sin telefono, no se manda nada, sin error

        const numero = normalizarTelefono(cliente.telefono)
        if (!numero) {
          console.log(`Teléfono con formato raro para ${cliente.nombre}, se omite: ${cliente.telefono}`)
          return
        }

        const saldo = await calcularSaldo(t.clienteId)
        const texto =
          t.tipo === 'cargo' ? mensajeFiado(cliente.nombre, t.monto, saldo) : mensajePago(cliente.nombre, t.monto, saldo)

        const jid = numero + '@s.whatsapp.net'
        await sock.sendMessage(jid, { text: texto })
        console.log(`Mensaje enviado a ${cliente.nombre} (${numero})`)
      } catch (error) {
        // Esto es un extra, no algo critico: si falla el envio de un mensaje,
        // se anota en la consola pero el programa sigue funcionando normal.
        console.error('No se pudo enviar un mensaje de WhatsApp (no pasa nada, se sigue funcionando):', error.message)
      }
    })
}

console.log('Iniciando servicio de WhatsApp para Minisúper El Puente...')
iniciarWhatsApp()
