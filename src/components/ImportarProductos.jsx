import { useState } from 'react'
import { ref, update } from 'firebase/database'
import { db } from '../firebase'
import { formatColones } from '../utils/dateUtils'
import { parsearXmlProductos, partirEscrituras, planificarImportacion } from '../utils/productos'

const EJEMPLOS = 5

export default function ImportarProductos({ productos, onCerrar }) {
  const [plan, setPlan] = useState(null)
  const [omitidos, setOmitidos] = useState(0)
  const [error, setError] = useState('')
  const [leyendo, setLeyendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [listo, setListo] = useState(false)

  async function handleArchivo(e) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setError('')
    setPlan(null)
    setLeyendo(true)
    try {
      const { productos: importados, omitidos: cantOmitidos } = parsearXmlProductos(await archivo.text())
      setOmitidos(cantOmitidos)
      setPlan(planificarImportacion(productos, importados))
    } catch (err) {
      setError(err.message || 'No se pudo leer el archivo')
    }
    setLeyendo(false)
  }

  async function handleImportar() {
    setGuardando(true)
    setError('')
    try {
      for (const tanda of partirEscrituras(plan.escrituras)) {
        await update(ref(db, 'productos'), tanda)
      }
      setListo(true)
    } catch {
      setError('No se pudo guardar. Revisá la conexión e intentá de nuevo (lo que ya se guardó no se duplica).')
    }
    setGuardando(false)
  }

  const hayCambios = plan && Object.keys(plan.escrituras).length > 0

  return (
    <div className="modal-fondo" onClick={guardando ? undefined : onCerrar}>
      <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-titulo">Importar productos</h2>
        <p className="texto-trazabilidad">
          Subí el XML de productos exportado del sistema de ventas. Los precios se actualizan y los productos nuevos
          se agregan.
        </p>

        {!listo && (
          <input className="campo-input" type="file" accept=".xml,text/xml" onChange={handleArchivo} disabled={guardando} />
        )}
        {leyendo && <p className="texto-trazabilidad">Leyendo archivo...</p>}
        {error && <p className="mensaje-error">{error}</p>}

        {plan && !listo && (
          <div className="importar-resumen">
            {plan.primeraVez && (
              <p className="importar-aviso">
                Es la primera importación: los {plan.nuevos.length} productos se guardan sin quedar pendientes de
                imprimir.
              </p>
            )}
            <ul>
              <li>
                <strong>{plan.nuevos.length}</strong> nuevos{!plan.primeraVez && ' (quedan pendientes)'}
              </li>
              <li>
                <strong>{plan.preciosCambiados.length}</strong> con precio distinto
              </li>
              <li>
                <strong>{plan.sinCambios}</strong> sin cambios
              </li>
              <li>
                <strong>{omitidos}</strong> omitidos (sin nombre o con precio en cero)
              </li>
            </ul>

            {!plan.primeraVez && plan.nuevos.length > 0 && (
              <>
                <p className="importar-subtitulo">Nuevos</p>
                {plan.nuevos.slice(0, EJEMPLOS).map((p) => (
                  <p className="importar-ejemplo" key={p.id}>
                    {p.nombre} · {formatColones(p.precio)}
                  </p>
                ))}
                {plan.nuevos.length > EJEMPLOS && <p className="importar-ejemplo">y {plan.nuevos.length - EJEMPLOS} más</p>}
              </>
            )}
            {plan.preciosCambiados.length > 0 && (
              <>
                <p className="importar-subtitulo">Cambios de precio</p>
                {plan.preciosCambiados.slice(0, EJEMPLOS).map((p) => (
                  <p className="importar-ejemplo" key={p.id}>
                    {p.nombre} · {formatColones(p.precioAnterior)} → {formatColones(p.precio)}
                  </p>
                ))}
                {plan.preciosCambiados.length > EJEMPLOS && (
                  <p className="importar-ejemplo">y {plan.preciosCambiados.length - EJEMPLOS} más</p>
                )}
              </>
            )}
          </div>
        )}

        {listo && <p className="importar-aviso">Listo, productos actualizados.</p>}

        <div className="modal-acciones">
          <button className="btn-secundario" type="button" onClick={onCerrar} disabled={guardando}>
            {listo ? 'Cerrar' : 'Cancelar'}
          </button>
          {!listo && (
            <button className="btn-primario" type="button" onClick={handleImportar} disabled={!hayCambios || guardando}>
              {guardando ? 'Guardando...' : 'Importar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
