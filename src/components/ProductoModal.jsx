import { useState } from 'react'
import { ref, push, update, remove } from 'firebase/database'
import { db } from '../firebase'
import { formatColones } from '../utils/dateUtils'
import { codigosDe, limpiarNombre, nombrePublicoDe, parsearCodigos } from '../utils/productos'

export default function ProductoModal({ productoId, producto, nombrePerfil, onCerrar }) {
  const esNuevo = !productoId
  const vieneDelSistema = producto?.idSistema != null

  const [nombrePublico, setNombrePublico] = useState(producto ? nombrePublicoDe(producto) : '')
  const [nombre, setNombre] = useState(producto?.nombre || '')
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : '')
  const [codigos, setCodigos] = useState(producto ? codigosDe(producto).join(', ') : '')
  const [error, setError] = useState('')
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const publicoLimpio = limpiarNombre(nombrePublico)
    const precioNum = Math.round(Number(precio))
    if (publicoLimpio.length < 2) {
      setError('Poné un nombre válido')
      return
    }
    if (!(precioNum > 0)) {
      setError('El precio tiene que ser mayor a cero')
      return
    }
    // El nombre del sistema solo se edita en productos creados a mano; en los
    // importados lo manda el XML y se sobrescribe en cada importación.
    const nombreSistema = vieneDelSistema ? producto.nombre : limpiarNombre(nombre) || publicoLimpio
    const datos = {
      nombre: nombreSistema,
      nombrePublico: publicoLimpio,
      precio: precioNum,
      codigos: parsearCodigos(codigos),
    }
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

        <label className="campo-label">Nombre para el público (el que se imprime)</label>
        <input
          className="campo-input"
          value={nombrePublico}
          onChange={(e) => setNombrePublico(e.target.value)}
          autoFocus
        />

        <label className="campo-label">Nombre en el sistema (como en la factura)</label>
        <input
          className="campo-input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          disabled={vieneDelSistema}
          placeholder={vieneDelSistema ? '' : 'Opcional, si no se usa el mismo'}
        />

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
            Viene del sistema de ventas. El nombre del sistema y el precio se actualizan al importar; el nombre para
            el público no. Si cambiás el precio acá, la próxima importación lo vuelve a poner con el del sistema.
          </p>
        )}

        {error && <p className="mensaje-error">{error}</p>}

        {confirmandoBorrado ? (
          <div className="confirmacion-borrado">
            <p>
              ¿Eliminar {nombrePublicoDe(producto)} ({formatColones(producto.precio)})?
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
