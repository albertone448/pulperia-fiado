import { useState, useMemo } from 'react'
import { ref, push, update } from 'firebase/database'
import { db } from '../firebase'
import { calcularDeuda } from '../utils/deudas'
import { formatColones, formatFechaHora } from '../utils/dateUtils'

const LIMITE_DEFAULT = 50000

export default function ClientList({ clientes, transacciones, onAbrirCliente }) {
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [viendoArchivo, setViendoArchivo] = useState(false)

  const filtroBusqueda = (cliente) =>
    cliente.nombre?.toLowerCase().includes(busqueda.toLowerCase().trim())

  const listaOrdenada = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => !cliente.inactivo && !cliente.suspendido)
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

  const eliminados = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => cliente.inactivo)
      .sort(([, a], [, b]) => (b.inactivoDesde || 0) - (a.inactivoDesde || 0))
  }, [clientes])

  // Los totales se calculan sobre todos los clientes con deuda (sin filtro de
  // búsqueda), para que el resumen de arriba no cambie mientras se escribe.
  const totalActivos = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => !cliente.inactivo && !cliente.suspendido)
      .reduce((acc, [id]) => acc + calcularDeuda(transacciones, id), 0)
  }, [clientes, transacciones])

  const totalSuspendidos = useMemo(() => {
    return Object.entries(clientes || {})
      .filter(([, cliente]) => cliente.suspendido)
      .reduce((acc, [id]) => acc + calcularDeuda(transacciones, id), 0)
  }, [clientes, transacciones])

  const totalGeneral = totalActivos + totalSuspendidos

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
                <span className="fila-cliente-nombre">{cliente.nombre}</span>
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
      </div>

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
