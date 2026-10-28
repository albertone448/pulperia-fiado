import { useState } from 'react'
import { ref, push, update, remove } from 'firebase/database'
import { db } from '../firebase'
import { formatColones } from '../utils/dateUtils'
import { codigosDe, limpiarNombre, parsearCodigos } from '../utils/productos'

export default function ProductoModal({ productoId, producto, nombrePerfil, onCerrar }) {
  const esNuevo = !productoId
  const vieneDelSistema = producto?.idSistema != null

  const [nombre, setNombre] = useState(producto?.nombre || '')
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : '')
  const [codigos, setCodigos] = useState(producto ? codigosDe(producto).join(', ') : '')
  const [error, setError] = useState('')
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const nombreLimpio = limpiarNombre(nombre)
    const precioNum = Math.round(Number(precio))
    if (nombreLimpio.length < 2) {
      setError('Poné un nombre válido')
      return
    }
    if (!(precioNum > 0)) {
      setError('El precio tiene que ser mayor a cero')
      return
    }
    const datos = { nombre: nombreLimpio, precio: precioNum, codigos: parsearCodigos(codigos) }
    const ahora = Date.now()

    if (esNuevo) {
      push(ref(db, 'productos'), {
        ...datos,
        idSistema: null,
        pendiente: true,
        impresoAlgunaVez: false,
        creado: ahora,
        actualizadoPor: nombrePerfil,
      })
    } else {
      const cambioPrecio = precioNum !== producto.precio
      update(ref(db, `productos/${productoId}`), {
        ...datos,
        actualizadoPor: nombrePerfil,
        ...(cambioPrecio && { precioActualizadoEn: ahora }),
        // Si la etiqueta ya estuvo en el estante, con el precio nuevo hay que reimprimirla.
        ...(cambioPrecio && producto.impresoAlgunaVez && { pendiente: true }),
      })
    }
    onCerrar()
  }

  function handleEliminar() {
    remove(ref(db, `productos/${productoId}`))
    onCerrar()
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-titulo">{esNuevo ? 'Nuevo producto' : 'Editar producto'}</h2>

        <label className="campo-label">Nombre</label>
        <input className="campo-input" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />

        <label className="campo-label">Precio de venta (₡)</label>
        <input
          className="campo-input campo-monto"
          type="number"
          inputMode="numeric"
          min="1"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
        />

        <label className="campo-label">Códigos de barras (opcional)</label>
        <input
          className="campo-input"
          inputMode="numeric"
          value={codigos}
          onChange={(e) => setCodigos(e.target.value)}
          placeholder="Separados por coma si son varios"
        />

        {vieneDelSistema && (
          <p className="texto-trazabilidad texto-producto-sistema">
            Viene del sistema de ventas. Si cambiás el precio acá, la próxima importación lo vuelve a poner con el
            precio del sistema.
          </p>
        )}

        {error && <p className="mensaje-error">{error}</p>}

        {confirmandoBorrado ? (
          <div className="confirmacion-borrado">
            <p>
              ¿Eliminar {producto.nombre} ({formatColones(producto.precio)})?
            </p>
            <div className="modal-acciones">
              <button className="btn-secundario" type="button" onClick={() => setConfirmandoBorrado(false)}>
                No
              </button>
              <button className="btn-peligro" type="button" onClick={handleEliminar}>
                Sí, eliminar
              </button>
            </div>
          </div>
        ) : (
          <>
            {!esNuevo && !vieneDelSistema && (
              <div className="modal-acciones-secundarias">
                <button className="btn-peligro-texto" type="button" onClick={() => setConfirmandoBorrado(true)}>
                  Eliminar producto
                </button>
              </div>
            )}
            <div className="modal-acciones">
              <button className="btn-secundario" type="button" onClick={onCerrar}>
                Cancelar
              </button>
              <button className="btn-primario" type="submit">
                Guardar
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
