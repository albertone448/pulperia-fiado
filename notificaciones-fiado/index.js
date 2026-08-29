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
const nodemailer = require('nodemailer')

// ---------- Firebase ----------

const credencialesPath = process.env.FIREBASE_CREDENTIALS_PATH || './firebase-credenciales.json'

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(credencialesPath))),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
})

const db = admin.database()

// ---------- Correo (SMTP) ----------

// El correo es opcional: si no hay SMTP_HOST configurado, el transportador
// queda en null y las notificaciones por correo simplemente se omiten, igual
// que un cliente sin teléfono se omite para WhatsApp.
const transportadorCorreo = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null

async function enviarCorreo(destinatario, asunto, texto, html) {
  await transportadorCorreo.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destinatario,
    subject: asunto,
    text: texto,
    html,
  })
}

// ---------- Utilidades ----------

// Formatea un monto entero como colones con comas: 15000 -> "₡15,000"
function formatColones(monto) {
  const numero = Math.round(monto || 0)
  return '₡' + numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Fecha corta dd/mm, para el detalle de movimientos del recordatorio semanal.
function fechaCorta(timestamp) {
  const f = new Date(timestamp)
  const dia = String(f.getDate()).padStart(2, '0')
  const mes = String(f.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

// Fecha y hora completas, para el recibo de una transacción individual.
function fechaHoraTexto(timestamp) {
  return new Date(timestamp).toLocaleString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
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

// Las últimas N transacciones de un cliente, en orden cronológico (más vieja
// primero), para el detalle del recordatorio semanal.
async function ultimasTransacciones(clienteId, cantidad) {
  const snap = await db.ref('transacciones').orderByChild('clienteId').equalTo(clienteId).once('value')
  const lista = []
  snap.forEach((child) => {
    const t = child.val()
    if (t.tipo === 'cargo' || t.tipo === 'pago') lista.push(t)
  })
  lista.sort((a, b) => a.timestamp - b.timestamp)
  return lista.slice(-cantidad)
}

// ---------- Mensajes: recibo por transacción ----------

function asuntoCorreoTransaccion(tipo) {
  return tipo === 'cargo' ? 'Nuevo fiado registrado - Minisúper El Puente' : 'Pago registrado - Minisúper El Puente'
}

// La primera línea va suelta (fuera del bloque de comillas triples) porque
// en la notificación del celular WhatsApp solo alcanza a mostrar esa primera
// línea; el bloque completo con formato de columnas se ve al abrir el chat.
function textoReciboWhatsapp(tipo, nombre, monto, saldo, fechaTexto) {
  const encabezado = tipo === 'cargo' ? 'Recibo de compra' : 'Recibo de pago'
  let texto = `🧾 ${encabezado} - Minisúper El Puente

\`\`\`
Cliente:  ${nombre}
Fecha:    ${fechaTexto}
--------------------------------
Monto:              ${formatColones(monto)}
Saldo pendiente:   ${formatColones(saldo)}
--------------------------------
\`\`\``
  if (tipo === 'pago' && saldo <= 0) {
    texto += '\n\nSu cuenta quedó al día. ¡Gracias!'
  }
  return texto
}

function textoReciboPlano(tipo, nombre, monto, saldo, fechaTexto) {
  return textoReciboWhatsapp(tipo, nombre, monto, saldo, fechaTexto).replace(/```/g, '')
}

function htmlReciboTransaccion(tipo, nombre, monto, saldo, fechaTexto) {
  const subtitulo = tipo === 'cargo' ? 'Recibo de compra' : 'Recibo de pago'
  const filaCierre =
    tipo === 'pago' && saldo <= 0
      ? '<tr><td colspan="2" style="padding-top:10px; font-size:13px; color:#75717e;">Su cuenta quedó al día. ¡Gracias!</td></tr>'
      : ''

  return `
<div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto; border:1px solid #e7e2ee; border-radius:10px; overflow:hidden;">
  <div style="background:#522d80; color:#fff; padding:20px 22px 16px;">
    <div style="font-size:19px; font-weight:bold;">Minisúper El Puente</div>
    <div style="font-size:13px; opacity:0.85; margin-top:2px;">${subtitulo}</div>
  </div>
  <div style="padding:20px 22px;">
    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:7px 0; color:#75717e; border-bottom:1px solid #efe6f9;">Cliente</td><td style="padding:7px 0; text-align:right; font-family:'Courier New',monospace; border-bottom:1px solid #efe6f9;">${nombre}</td></tr>
      <tr><td style="padding:7px 0; color:#75717e; border-bottom:1px solid #efe6f9;">Fecha</td><td style="padding:7px 0; text-align:right; font-family:'Courier New',monospace; border-bottom:1px solid #efe6f9;">${fechaTexto}</td></tr>
      <tr><td style="padding:7px 0; color:#75717e; border-bottom:1px solid #efe6f9;">Monto</td><td style="padding:7px 0; text-align:right; font-family:'Courier New',monospace; border-bottom:1px solid #efe6f9;">${formatColones(monto)}</td></tr>
      <tr><td style="padding:10px 0 0; font-weight:bold; font-size:15px; border-top:2px solid #2a2732;">Saldo pendiente</td><td style="padding:10px 0 0; text-align:right; font-family:'Courier New',monospace; font-weight:bold; color:#522d80; border-top:2px solid #2a2732;">${formatColones(saldo)}</td></tr>
      ${filaCierre}
    </table>
  </div>
  <div style="padding:12px 22px 16px; font-size:11px; color:#a29db0; border-top:1px solid #efe6f9;">Este es un mensaje automático de Minisúper El Puente.</div>
</div>`
}

// ---------- Mensajes: recordatorio semanal ----------

function textoRecordatorioWhatsapp(nombre, movimientos, saldo) {
  const filas = movimientos
    .map((t) => {
      const detalle = t.tipo === 'cargo' ? 'Compra' : 'Pago'
      const monto = t.tipo === 'pago' ? '-' + formatColones(t.monto) : formatColones(t.monto)
      return `${fechaCorta(t.timestamp)}   ${detalle.padEnd(8)}${monto}`
    })
    .join('\n')

  return `Buenos días 👋 Por este medio le compartimos un resumen automatizado de su cuenta en Minisúper El Puente.

🧾 Recordatorio semanal

\`\`\`
Cliente: ${nombre}

Últimos movimientos:
--------------------------------
${filas}
--------------------------------
Saldo pendiente:    ${formatColones(saldo)}
\`\`\``
}

function textoRecordatorioPlano(nombre, movimientos, saldo) {
  return textoRecordatorioWhatsapp(nombre, movimientos, saldo).replace(/```/g, '')
}

function htmlRecordatorioSemanal(nombre, movimientos, saldo) {
  const filas = movimientos
    .map((t) => {
      const detalle = t.tipo === 'cargo' ? 'Compra' : 'Pago'
      const monto = t.tipo === 'pago' ? '-' + formatColones(t.monto) : formatColones(t.monto)
      return `<tr><td style="padding:5px 4px; border-bottom:1px solid #f2eef8;">${fechaCorta(t.timestamp)}</td><td style="padding:5px 4px; border-bottom:1px solid #f2eef8;">${detalle}</td><td style="padding:5px 4px; text-align:right; border-bottom:1px solid #f2eef8; font-family:'Courier New',monospace;">${monto}</td></tr>`
    })
    .join('')

  return `
<div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto; border:1px solid #e7e2ee; border-radius:10px; overflow:hidden;">
  <div style="background:#522d80; color:#fff; padding:20px 22px 16px;">
    <div style="font-size:19px; font-weight:bold;">Minisúper El Puente</div>
    <div style="font-size:13px; opacity:0.85; margin-top:2px;">Recordatorio semanal</div>
  </div>
  <div style="padding:20px 22px;">
    <p style="font-size:14px; color:#4a4650; margin:0 0 14px;">Buenos días 👋 Por este medio le compartimos un resumen automatizado de su cuenta.</p>
    <p style="font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:#75717e; margin:0 0 8px; font-weight:bold;">Últimos movimientos</p>
    <table style="width:100%; border-collapse:collapse; font-size:13px;">
      <tr>
        <th style="text-align:left; font-size:11px; color:#75717e; border-bottom:2px solid #e7e2ee; padding:5px 4px;">Fecha</th>
        <th style="text-align:left; font-size:11px; color:#75717e; border-bottom:2px solid #e7e2ee; padding:5px 4px;">Detalle</th>
        <th style="text-align:right; font-size:11px; color:#75717e; border-bottom:2px solid #e7e2ee; padding:5px 4px;">Monto</th>
      </tr>
      ${filas}
    </table>
    <table style="width:100%; border-collapse:collapse; margin-top:8px;">
      <tr><td style="padding:10px 0 0; font-weight:bold; font-size:15px; border-top:2px solid #2a2732;">Saldo pendiente</td><td style="padding:10px 0 0; text-align:right; font-family:'Courier New',monospace; font-weight:bold; color:#522d80; border-top:2px solid #2a2732;">${formatColones(saldo)}</td></tr>
    </table>
  </div>
  <div style="padding:12px 22px 16px; font-size:11px; color:#a29db0; border-top:1px solid #efe6f9;">Este es un mensaje automático de Minisúper El Puente.</div>
</div>`
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
      iniciarRecordatorioSemanal()
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
        if (!cliente) return

        // notificarWhatsapp no estar definido cuenta como "sí" (clientes de
        // antes de este campo existir siguen recibiendo WhatsApp como
        // siempre); notificarCorreo no definido cuenta como "no", ya que es
        // un canal nuevo que hay que activar a mano por cliente.
        const quiereWhatsapp = !!cliente.telefono && cliente.notificarWhatsapp !== false
        const quiereCorreo = !!cliente.correo && cliente.notificarCorreo === true

        if (!quiereWhatsapp && !quiereCorreo) return

        const saldo = await calcularSaldo(t.clienteId)
        const fechaTexto = fechaHoraTexto(t.timestamp)

        if (quiereWhatsapp) {
          try {
            const numero = normalizarTelefono(cliente.telefono)
            if (!numero) {
              console.log(`Teléfono con formato raro para ${cliente.nombre}, se omite WhatsApp: ${cliente.telefono}`)
            } else {
              const jid = numero + '@s.whatsapp.net'
              const texto = textoReciboWhatsapp(t.tipo, cliente.nombre, t.monto, saldo, fechaTexto)
              await sock.sendMessage(jid, { text: texto })
              console.log(`WhatsApp enviado a ${cliente.nombre} (${numero})`)
            }
          } catch (error) {
            console.error(`No se pudo enviar el WhatsApp a ${cliente.nombre} (no pasa nada, se sigue funcionando):`, error.message)
          }
        }

        if (quiereCorreo) {
          if (!transportadorCorreo) {
            console.log(`${cliente.nombre} tiene el correo activado pero el SMTP no está configurado en el .env, se omite.`)
          } else {
            try {
              const texto = textoReciboPlano(t.tipo, cliente.nombre, t.monto, saldo, fechaTexto)
              const html = htmlReciboTransaccion(t.tipo, cliente.nombre, t.monto, saldo, fechaTexto)
              await enviarCorreo(cliente.correo, asuntoCorreoTransaccion(t.tipo), texto, html)
              console.log(`Correo enviado a ${cliente.nombre} (${cliente.correo})`)
            } catch (error) {
              console.error(`No se pudo enviar el correo a ${cliente.nombre} (no pasa nada, se sigue funcionando):`, error.message)
            }
          }
        }
      } catch (error) {
        // Esto es un extra, no algo critico: si falla el envio de una
        // notificacion, se anota en la consola pero el programa sigue
        // funcionando normal.
        console.error('No se pudo procesar una notificación (no pasa nada, se sigue funcionando):', error.message)
      }
    })
}

// ---------- Recordatorio semanal de saldo pendiente ----------

// getDay(): domingo = 0 ... sábado = 6
const DIA_RECORDATORIO = process.env.RECORDATORIO_DIA_SEMANA !== undefined ? Number(process.env.RECORDATORIO_DIA_SEMANA) : 6
const HORA_RECORDATORIO = process.env.RECORDATORIO_HORA !== undefined ? Number(process.env.RECORDATORIO_HORA) : 4

// Calcula la ocurrencia más reciente de "día de la semana + hora" que ya
// pasó (o está pasando ahora mismo). Por ejemplo, con sábado 4am: un viernes
// cualquiera devuelve el sábado de la semana pasada; un sábado a las 7am
// devuelve hoy mismo a las 4am.
function calcularUltimoObjetivo() {
  const ahora = new Date()
  const objetivo = new Date(ahora)
  const diferenciaDias = (ahora.getDay() - DIA_RECORDATORIO + 7) % 7
  objetivo.setDate(ahora.getDate() - diferenciaDias)
  objetivo.setHours(HORA_RECORDATORIO, 0, 0, 0)
  if (objetivo > ahora) objetivo.setDate(objetivo.getDate() - 7)
  return objetivo
}

function comoClave(fecha) {
  // Solo se usa para comparar "¿ya mandé el de este ciclo?", no se muestra.
  return fecha.toISOString().slice(0, 10)
}

async function revisarRecordatorioSemanal() {
  try {
    const objetivo = calcularUltimoObjetivo()
    const clave = comoClave(objetivo)

    const snap = await db.ref('configuracion/recordatorioSemanal/ultimoEnviado').once('value')
    if (snap.val() === clave) return // ya se mandó el de este ciclo

    console.log(`Enviando recordatorio semanal (ciclo del ${clave})...`)
    await enviarRecordatorioSemanal()
    await db.ref('configuracion/recordatorioSemanal/ultimoEnviado').set(clave)
    console.log('Recordatorio semanal enviado.')
  } catch (error) {
    console.error('No se pudo revisar/enviar el recordatorio semanal (no pasa nada, se reintenta más tarde):', error.message)
  }
}

async function enviarRecordatorioSemanal() {
  const snap = await db.ref('clientes').once('value')
  const clientes = snap.val() || {}

  for (const [clienteId, cliente] of Object.entries(clientes)) {
    const quiereWhatsapp = !!cliente.telefono && cliente.notificarWhatsapp !== false
    const quiereCorreo = !!cliente.correo && cliente.notificarCorreo === true
    if (!quiereWhatsapp && !quiereCorreo) continue

    const saldo = await calcularSaldo(clienteId)
    if (saldo <= 0) continue

    const movimientos = await ultimasTransacciones(clienteId, 5)

    if (quiereWhatsapp) {
      try {
        const numero = normalizarTelefono(cliente.telefono)
        if (numero) {
          const texto = textoRecordatorioWhatsapp(cliente.nombre, movimientos, saldo)
          await sock.sendMessage(numero + '@s.whatsapp.net', { text: texto })
          console.log(`Recordatorio semanal por WhatsApp enviado a ${cliente.nombre}`)
        }
      } catch (error) {
        console.error(`No se pudo enviar el recordatorio por WhatsApp a ${cliente.nombre}:`, error.message)
      }
    }

    if (quiereCorreo && transportadorCorreo) {
      try {
        const texto = textoRecordatorioPlano(cliente.nombre, movimientos, saldo)
        const html = htmlRecordatorioSemanal(cliente.nombre, movimientos, saldo)
        await enviarCorreo(cliente.correo, 'Resumen semanal de su cuenta - Minisúper El Puente', texto, html)
        console.log(`Recordatorio semanal por correo enviado a ${cliente.nombre}`)
      } catch (error) {
        console.error(`No se pudo enviar el recordatorio por correo a ${cliente.nombre}:`, error.message)
      }
    }
  }
}

// Se revisa una vez apenas conecta (cubre el caso normal: la compu se prende
// y ya pasó la hora objetivo) y además cada hora mientras sigue corriendo,
// como red de seguridad por si la compu se queda prendida varios días
// seguidos sin volver a arrancar el programa.
function iniciarRecordatorioSemanal() {
  revisarRecordatorioSemanal()
  setInterval(revisarRecordatorioSemanal, 60 * 60 * 1000)
}

console.log('Iniciando servicio de notificaciones para Minisúper El Puente...')
iniciarWhatsApp()
