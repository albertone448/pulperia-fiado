import { useState, useMemo } from 'react'
import { ref, push, update } from 'firebase/database'
import { db } from '../firebase'
import { calcularDeuda } from '../utils/deudas'
import { formatColones, formatFechaHora } from '../utils/dateUtils'

const LIMITE_DEFAULT = 50000

export default function ClientList({ clientes, transacciones, perfilActivo, perfiles, onAbrirCliente }) {
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [creandoEsporadico, setCreandoEsporadico] = useState(false)
  const [viendoArchivo, setViendoArchivo] = useState(false)

  const filtroBusqueda = (cliente) =>
    cliente.nombre?.toLowerCase().includes(busqueda.toLowerCase().trim())

  const listaOrdenada = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => !cliente.inactivo && !cliente.suspendido && !cliente.esporadico)
      .map(([id, cliente]) => ({
        id,
        cliente,
        deuda: calcularDeuda(transacciones, id),
      }))
      .filter(({ cliente }) => filtroBusqueda(cliente))
      .sort((a, b) => b.deuda - a.deuda)
  }, [clientes, transacciones, busqueda])

  const suspendidos = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => cliente.suspendido)
      .map(([id, cliente]) => ({
        id,
        cliente,
        deuda: calcularDeuda(transacciones, id),
      }))
      .filter(({ cliente }) => filtroBusqueda(cliente))
      .sort((a, b) => b.deuda - a.deuda)
  }, [clientes, transacciones, busqueda])

  // Una venta esporádica se cierra sola cuando se termina de pagar (queda
  // inactiva), así que acá solo entran las que todavía están abiertas.
  const esporadicosAbiertos = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => cliente.esporadico && !cliente.inactivo)
      .map(([id, cliente]) => ({
        id,
        cliente,
        deuda: calcularDeuda(transacciones, id),
      }))
      .filter(({ cliente }) => filtroBusqueda(cliente))
      .sort((a, b) => b.deuda - a.deuda)
  }, [clientes, transacciones, busqueda])

  const eliminados = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => cliente.inactivo)
      .sort(([, a], [, b]) => (b.inactivoDesde || 0) - (a.inactivoDesde || 0))
  }, [clientes])

  // Los totales se calculan sobre todos los clientes con deuda (sin filtro de
  // búsqueda), para que el resumen de arriba no cambie mientras se escribe.
  const totalActivos = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => !cliente.inactivo && !cliente.suspendido && !cliente.esporadico)
      .reduce((acc, [id]) => acc + calcularDeuda(transacciones, id), 0)
  }, [clientes, transacciones])

  const totalSuspendidos = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => cliente.suspendido)
      .reduce((acc, [id]) => acc + calcularDeuda(transacciones, id), 0)
  }, [clientes, transacciones])

  const totalEsporadicos = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => cliente.esporadico && !cliente.inactivo)
      .reduce((acc, [id]) => acc + calcularDeuda(transacciones, id), 0)
  }, [clientes, transacciones])

  const totalGeneral = totalActivos + totalSuspendidos + totalEsporadicos

  function restaurarCliente(id) {
    update(ref(db, `clientes/${id}`), { inactivo: null, inactivoDesde: null })
  }

  if (viendoArchivo) {
    return (
      <div className="contenedor">
        <button className="btn-link" onClick={() => setViendoArchivo(false)}>
          &larr; Volver a clientes
        </button>
        <h2 className="cliente-nombre-grande">Clientes eliminados</h2>

        <div className="lista-clientes">
          {eliminados.length === 0 && (
            <p className="texto-vacio">No hay clientes eliminados.</p>
          )}
          {eliminados.map(([id, cliente]) => (
            <div key={id} className="fila-cliente fila-cliente-eliminado">
              <div className="fila-cliente-info">
                <span className="fila-cliente-nombre">
                  {cliente.nombre}
                  {cliente.esporadico && <span className="etiqueta-esporadico">Esporádico</span>}
                </span>
                {cliente.telefono && <span className="fila-cliente-telefono">{cliente.telefono}</span>}
                {cliente.inactivoDesde && (
                  <span className="texto-trazabilidad">
                    Eliminado el {formatFechaHora(cliente.inactivoDesde)}
                  </span>
                )}
              </div>
              <button className="btn-secundario" type="button" onClick={() => restaurarCliente(id)}>
                Restaurar
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="contenedor">
      <div className="barra-superior">
        <input
          className="campo-input campo-busqueda"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button className="btn-primario btn-ancho-fijo" onClick={() => setCreando(true)}>
          + Cliente
        </button>
      </div>

      <div className="resumen-total-general">
        Total fiado: <strong>{formatColones(totalGeneral)}</strong>
        {totalSuspendidos > 0 && (
          <p className="resumen-total-detalle">
            De los cuales {formatColones(totalSuspendidos)} están en cuentas suspendidas
          </p>
        )}
        {totalEsporadicos > 0 && (
          <p className="resumen-total-detalle">
            De los cuales {formatColones(totalEsporadicos)} son de ventas esporádicas abiertas
          </p>
        )}
      </div>

      <div className="seccion-esporadicos-header">
        <h3 className="subtitulo-historial subtitulo-sin-margen">Ventas esporádicas</h3>
        <button className="btn-link" type="button" onClick={() => setCreandoEsporadico(true)}>
          + Nueva
        </button>
      </div>
      {esporadicosAbiertos.length > 0 && (
        <div className="lista-clientes">
          {esporadicosAbiertos.map(({ id, cliente, deuda }) => (
            <button key={id} className="fila-cliente" onClick={() => onAbrirCliente(id)}>
              <div className="fila-cliente-info">
                <span className="fila-cliente-nombre">
                  {cliente.nombre}
                  <span className="etiqueta-esporadico">Esporádico</span>
                </span>
                {cliente.telefono && <span className="fila-cliente-telefono">{cliente.telefono}</span>}
              </div>
              <span className="monto-deuda">{formatColones(deuda)}</span>
            </button>
          ))}
        </div>
      )}

      <h3 className="subtitulo-historial">Clientes</h3>
      <div className="lista-clientes">
        {listaOrdenada.length === 0 && (
          <p className="texto-vacio">No hay clientes todavía. Creá el primero.</p>
        )}
        {listaOrdenada.map(({ id, cliente, deuda }) => (
          <button key={id} className="fila-cliente" onClick={() => onAbrirCliente(id)}>
            <div className="fila-cliente-info">
              <span className="fila-cliente-nombre">{cliente.nombre}</span>
              {cliente.telefono && <span className="fila-cliente-telefono">{cliente.telefono}</span>}
            </div>
            <div className="fila-cliente-derecha">
              <span className={deuda > (cliente.limite ?? LIMITE_DEFAULT) ? 'monto-deuda monto-deuda-excedido' : 'monto-deuda'}>
                {formatColones(deuda)}
              </span>
              {deuda > (cliente.limite ?? LIMITE_DEFAULT) && (
                <span className="etiqueta-alerta">Pasó el límite</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {suspendidos.length > 0 && (
        <>
          <div className="separador-suspendidos">Suspendidos</div>
          <div className="lista-clientes">
            {suspendidos.map(({ id, cliente, deuda }) => (
              <button key={id} className="fila-cliente fila-cliente-suspendida" onClick={() => onAbrirCliente(id)}>
                <div className="fila-cliente-info">
                  <span className="fila-cliente-nombre">
                    {cliente.nombre}
                    <span className="etiqueta-suspendido">Suspendido</span>
                  </span>
                  {cliente.telefono && <span className="fila-cliente-telefono">{cliente.telefono}</span>}
                </div>
                <span className="monto-deuda">{formatColones(deuda)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {eliminados.length > 0 && (
        <button className="btn-link" onClick={() => setViendoArchivo(true)}>
          Ver clientes eliminados ({eliminados.length})
        </button>
      )}

      {creando && <NuevoCliente onCerrar={() => setCreando(false)} />}
      {creandoEsporadico && (
        <NuevaVentaEsporadica
          perfilActivo={perfilActivo}
          perfiles={perfiles}
          onCerrar={() => setCreandoEsporadico(false)}
          onCreada={(id) => {
            setCreandoEsporadico(false)
            onAbrirCliente(id)
          }}
        />
      )}
    </div>
  )
}

function NuevoCliente({ onCerrar }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [limite, setLimite] = useState(String(LIMITE_DEFAULT))
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (nombre.trim().length < 2) {
      setError('Poné el nombre del cliente')
      return
    }
    const nuevoRef = push(ref(db, 'clientes'))
    update(nuevoRef, {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      correo: correo.trim() || null,
      // Preferencias de notificación por defecto: WhatsApp activado (así se
      // mantiene el comportamiento de siempre) y correo apagado hasta que se
      // active a mano desde "Editar datos del cliente".
      notificarWhatsapp: true,
      notificarCorreo: false,
      limite: Number(limite) || LIMITE_DEFAULT,
      creado: Date.now(),
    })
    onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-titulo">Nuevo cliente</h2>

        <label className="campo-label">Nombre completo</label>
        <input className="campo-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />

        <label className="campo-label">Teléfono (opcional)</label>
        <input className="campo-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

        <label className="campo-label">Correo electrónico (opcional)</label>
        <input className="campo-input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />

        <label className="campo-label">Límite de crédito</label>
        <input
          className="campo-input"
          type="number"
          value={limite}
          onChange={(e) => setLimite(e.target.value)}
        />

        {error && <p className="mensaje-error">{error}</p>}

        <div className="modal-acciones">
          <button className="btn-secundario" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn-primario" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}

function NuevaVentaEsporadica({ perfilActivo, perfiles, onCerrar, onCreada }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (nombre.trim().length < 2) {
      setError('Poné el nombre de la persona')
      return
    }
    const montoNum = Number(monto) || 0
    if (montoNum <= 0) {
      setError('Poné el monto de la compra')
      return
    }

    const clienteRef = push(ref(db, 'clientes'))
    update(clienteRef, {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      correo: correo.trim() || null,
      esporadico: true,
      // Acá no hay casillas de notificación: si dejó el teléfono o el correo
      // es porque se quiere avisar por ahí, no tiene sentido un paso extra
      // para algo que va a pasar una sola vez.
      notificarWhatsapp: !!telefono.trim(),
      notificarCorreo: !!correo.trim(),
      creado: Date.now(),
    })

    const transaccionRef = push(ref(db, 'transacciones'))
    update(transaccionRef, {
      clienteId: clienteRef.key,
      tipo: 'cargo',
      descripcion: nota.trim() || '',
      monto: Math.round(montoNum),
      perfilId: perfilActivo,
      perfilNombre: perfiles[perfilActivo]?.nombre || '',
      timestamp: Date.now(),
    })

    onCreada(clienteRef.key)
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-titulo">Venta esporádica</h2>
        <p className="texto-trazabilidad">
          Para alguien que no es cliente habitual: se anota esta compra puntual y queda visible hasta que se
          pague por completo.
        </p>

        <label className="campo-label">Nombre</label>
        <input className="campo-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />

        <label className="campo-label">Teléfono (opcional)</label>
        <input className="campo-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

        <label className="campo-label">Correo electrónico (opcional)</label>
        <input className="campo-input" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />

        <label className="campo-label">Monto</label>
        <input
          className="campo-input campo-monto"
          type="number"
          inputMode="numeric"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0"
        />

        <label className="campo-label">Nota (opcional)</label>
        <input
          className="campo-input"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej. pan y leche"
        />

        {error && <p className="mensaje-error">{error}</p>}

        <div className="modal-acciones">
          <button className="btn-secundario" type="button" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn-primario" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
