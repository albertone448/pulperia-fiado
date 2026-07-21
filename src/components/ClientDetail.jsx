import { useState } from 'react'
import { ref, update } from 'firebase/database'
import { db } from '../firebase'
import { calcularDeuda, transaccionesDeCliente } from '../utils/deudas'
import { formatColones, formatFechaHora } from '../utils/dateUtils'
import NewChargeModal from './NewChargeModal'
import NewPaymentModal from './NewPaymentModal'
import EditTransactionModal from './EditTransactionModal'

const LIMITE_DEFAULT = 50000

export default function ClientDetail({ clienteId, cliente, transacciones, perfilActivo, perfiles, onVolver }) {
  const [modal, setModal] = useState(null) // 'cargo' | 'pago' | null
  const [editando, setEditando] = useState(null) // [id, transaccion] o null
  const [editandoLimite, setEditandoLimite] = useState(false)
  const [nuevoLimite, setNuevoLimite] = useState(String(cliente.limite ?? LIMITE_DEFAULT))

  const deuda = calcularDeuda(transacciones, clienteId)
  const limite = cliente.limite ?? LIMITE_DEFAULT
  const excedido = deuda > limite
  const historial = transaccionesDeCliente(transacciones, clienteId)

  function guardarLimite() {
    update(ref(db, `clientes/${clienteId}`), { limite: Number(nuevoLimite) || LIMITE_DEFAULT })
    setEditandoLimite(false)
  }

  return (
    <div className="contenedor">
      <button className="btn-link" onClick={onVolver}>
        &larr; Volver a clientes
      </button>

      <div className="tarjeta-cliente-header">
        <div>
          <h2 className="cliente-nombre-grande">{cliente.nombre}</h2>
          {cliente.telefono && <p className="cliente-telefono">{cliente.telefono}</p>}
        </div>
        <div className="cliente-deuda-box">
          <span className="cliente-deuda-label">Debe</span>
          <span className={excedido ? 'cliente-deuda-monto cliente-deuda-excedido' : 'cliente-deuda-monto'}>
            {formatColones(deuda)}
          </span>
        </div>
      </div>

      {excedido && (
        <p className="alerta-limite">
          Este cliente pasó su límite de crédito ({formatColones(limite)}).
        </p>
      )}

      <div className="limite-editor">
        {editandoLimite ? (
          <>
            <input
              className="campo-input campo-monto campo-limite-inline"
              type="number"
              value={nuevoLimite}
              onChange={(e) => setNuevoLimite(e.target.value)}
            />
            <button className="btn-link" onClick={guardarLimite}>
              Guardar
            </button>
            <button className="btn-link" onClick={() => setEditandoLimite(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <button className="btn-link" onClick={() => setEditandoLimite(true)}>
            Límite: {formatColones(limite)} (editar)
          </button>
        )}
      </div>

      <div className="acciones-cliente">
        <button className="btn-primario" onClick={() => setModal('cargo')}>
          + Anotar fiado
        </button>
        <button className="btn-secundario" onClick={() => setModal('pago')}>
          + Registrar pago
        </button>
      </div>

      <h3 className="subtitulo-historial">Historial</h3>
      <div className="lista-historial">
        {historial.length === 0 && <p className="texto-vacio">Todavía no hay movimientos.</p>}
        {historial.map(([id, t]) => (
          <button key={id} className="fila-historial" onClick={() => setEditando([id, t])}>
            <div className="fila-historial-info">
              <span className="fila-historial-desc">{t.descripcion}</span>
              <span className="fila-historial-fecha">
                {formatFechaHora(t.timestamp)} · {t.perfilNombre}
                {t.editadoEn && ' · editado'}
              </span>
            </div>
            <span className={t.tipo === 'cargo' ? 'monto-cargo' : 'monto-pago'}>
              {t.tipo === 'cargo' ? '+' : '-'}
              {formatColones(t.monto)}
            </span>
          </button>
        ))}
      </div>

      {modal === 'cargo' && (
        <NewChargeModal
          clienteId={clienteId}
          perfilActivo={perfilActivo}
          perfiles={perfiles}
          onCerrar={() => setModal(null)}
        />
      )}
      {modal === 'pago' && (
        <NewPaymentModal
          clienteId={clienteId}
          perfilActivo={perfilActivo}
          perfiles={perfiles}
          onCerrar={() => setModal(null)}
        />
      )}
      {editando && (
        <EditTransactionModal
          transaccionId={editando[0]}
          transaccion={editando[1]}
          perfilActivo={perfilActivo}
          perfiles={perfiles}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  )
}
