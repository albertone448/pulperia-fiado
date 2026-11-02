import { useEffect, useMemo, useState } from 'react'
import { ref, onValue, update } from 'firebase/database'
import { db } from '../firebase'
import { formatColones } from '../utils/dateUtils'
import { buscarPorCodigoExacto, buscarProductos, nombrePublicoDe } from '../utils/productos'
import HojaEtiquetas from './HojaEtiquetas'
import ProductoModal from './ProductoModal'
import ImportarProductos from './ImportarProductos'

export default function Etiquetas({ perfilActivo, perfiles }) {
  const [productos, setProductos] = useState(null) // null = cargando
  const [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState([]) // llaves, en el orden en que se agregaron
  const [editando, setEditando] = useState(null) // [llave, producto] | 'nuevo' | null
  const [importando, setImportando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(null) // lista de [llave, producto]
  const [porConfirmar, setPorConfirmar] = useState(null) // llaves impresas esperando confirmación

  // Son miles de productos, así que solo se descargan al entrar a esta pestaña.
  useEffect(() => {
    const unsub = onValue(ref(db, 'productos'), (snap) => setProductos(snap.val() || {}))
    return () => unsub()
  }, [])

  const lista = productos || {}
  const pendientes = useMemo(
    () =>
      Object.entries(lista)
        .filter(([, p]) => p.pendiente)
        .sort(([, a], [, b]) => nombrePublicoDe(a).localeCompare(nombrePublicoDe(b), 'es')),
    [lista],
  )
  const resultados = useMemo(() => buscarProductos(lista, busqueda), [lista, busqueda])
  const hayBusqueda = busqueda.trim() !== ''
  const mostrados = hayBusqueda ? resultados : pendientes
  const seleccionados = seleccion.filter((key) => lista[key]).map((key) => [key, lista[key]])
  const nombrePerfil = perfiles[perfilActivo]?.nombre || null

  function alternar(key) {
    setSeleccion((actual) => (actual.includes(key) ? actual.filter((k) => k !== key) : [...actual, key]))
  }

  // El lector de código de barras escribe los dígitos y manda Enter.
  function handleBuscarKeyDown(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const exacto = buscarPorCodigoExacto(lista, busqueda)
    if (!exacto) return
    setSeleccion((actual) => (actual.includes(exacto[0]) ? actual : [...actual, exacto[0]]))
    setBusqueda('')
  }

  function descartarPendiente(key) {
    update(ref(db, `productos/${key}`), { pendiente: false })
  }

  function seleccionarPendientes() {
    setSeleccion((actual) => [...new Set([...actual, ...pendientes.map(([key]) => key)])])
  }

  function handleImpresas() {
    const cambios = {}
    for (const key of porConfirmar) {
      cambios[`${key}/pendiente`] = false
      cambios[`${key}/impresoAlgunaVez`] = true
    }
    update(ref(db, 'productos'), cambios)
    setSeleccion((actual) => actual.filter((key) => !porConfirmar.includes(key)))
    setPorConfirmar(null)
  }

  if (productos === null) {
    return <div className="contenedor"><p className="texto-vacio">Cargando productos...</p></div>
  }

  return (
    <div className="contenedor">
      <div className="barra-superior">
        <input
          className="campo-input campo-busqueda"
          placeholder="Buscar por nombre o código de barras"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={handleBuscarKeyDown}
          autoFocus
        />
        <button className="btn-primario btn-ancho-fijo" onClick={() => setEditando('nuevo')}>
          + Nuevo
        </button>
      </div>

      {seleccionados.length > 0 && (
        <div className="etiquetas-seleccion">
          <div className="etiquetas-seleccion-header">
            <strong>Para imprimir ({seleccionados.length})</strong>
            <button className="btn-link" onClick={() => setSeleccion([])}>
              Vaciar
            </button>
          </div>
          {seleccionados.map(([key, p]) => (
            <div className="etiquetas-seleccion-fila" key={key}>
              <span className="etiquetas-seleccion-nombre">{nombrePublicoDe(p)}</span>
              <span className="monto-deuda">{formatColones(p.precio)}</span>
              <button className="btn-quitar-fila" onClick={() => alternar(key)} aria-label={`Quitar ${nombrePublicoDe(p)}`}>
                ×
              </button>
            </div>
          ))}
          <button className="btn-primario etiquetas-imprimir" onClick={() => setImprimiendo(seleccionados)}>
            Imprimir {seleccionados.length === 1 ? 'etiqueta' : `${seleccionados.length} etiquetas`}
          </button>
        </div>
      )}

      <div className="seccion-esporadicos-header etiquetas-titulo-lista">
        <h3 className="subtitulo-historial subtitulo-sin-margen">
          {hayBusqueda ? 'Resultados' : `Pendientes de imprimir (${pendientes.length})`}
        </h3>
        {!hayBusqueda && pendientes.length > 0 && (
          <button className="btn-link" onClick={seleccionarPendientes}>
            Agregar todos
          </button>
        )}
      </div>

      <div className="lista-clientes etiquetas-lista">
        {mostrados.length === 0 && (
          <p className="texto-vacio">
            {hayBusqueda
              ? 'No se encontró ningún producto.'
              : Object.keys(lista).length === 0
                ? 'Todavía no hay productos. Importá el XML del sistema o creá uno con "+ Nuevo".'
                : 'No hay etiquetas pendientes. Buscá un producto para imprimirle la etiqueta.'}
          </p>
        )}
        {mostrados.map(([key, p]) => (
          <div className="fila-cliente fila-producto" key={key}>
            <input
              type="checkbox"
              className="producto-check"
              checked={seleccion.includes(key)}
              onChange={() => alternar(key)}
              aria-label={`Seleccionar ${nombrePublicoDe(p)}`}
            />
            <button className="fila-producto-info" onClick={() => setEditando([key, p])}>
              <span className="fila-cliente-nombre">{nombrePublicoDe(p)}</span>
              {p.pendiente && <span className="etiqueta-esporadico etiqueta-pendiente">Pendiente</span>}
              {p.nombrePublico && p.nombrePublico !== p.nombre && (
                <span className="fila-producto-sistema">{p.nombre}</span>
              )}
            </button>
            <span className="monto-deuda">{formatColones(p.precio)}</span>
            {p.pendiente && (
              <button
                className="btn-quitar-fila"
                onClick={() => descartarPendiente(key)}
                aria-label={`Quitar de pendientes ${nombrePublicoDe(p)}`}
                title="No necesita etiqueta"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {hayBusqueda && resultados.length === 60 && (
          <p className="texto-trazabilidad">Se muestran los primeros 60. Escribí más para afinar.</p>
        )}
      </div>

      <div className="etiquetas-pie">
        <span className="texto-trazabilidad">{Object.keys(lista).length} productos guardados</span>
        <button className="btn-link" onClick={() => setImportando(true)}>
          Importar del sistema (XML)
        </button>
      </div>

      {editando && (
        <ProductoModal
          productoId={editando === 'nuevo' ? null : editando[0]}
          producto={editando === 'nuevo' ? null : editando[1]}
          nombrePerfil={nombrePerfil}
          onCerrar={() => setEditando(null)}
        />
      )}
      {importando && <ImportarProductos productos={lista} onCerrar={() => setImportando(false)} />}

      {imprimiendo && (
        <HojaEtiquetas
          productos={imprimiendo}
          onTerminado={() => {
            setPorConfirmar(imprimiendo.map(([key]) => key))
            setImprimiendo(null)
          }}
        />
      )}

      {porConfirmar && (
        <div className="modal-fondo">
          <div className="modal-tarjeta">
            <h2 className="modal-titulo">¿Salieron bien?</h2>
            <p>
              {porConfirmar.length === 1
                ? 'Si la etiqueta salió bien, se quita de pendientes.'
                : `Si las ${porConfirmar.length} etiquetas salieron bien, se quitan de pendientes.`}{' '}
              Si no, quedan como estaban para volver a imprimir.
            </p>
            <div className="modal-acciones">
              <button className="btn-secundario" onClick={() => setPorConfirmar(null)}>
                No, reintentar
              </button>
              <button className="btn-primario" onClick={handleImpresas}>
                Sí, salieron bien
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
