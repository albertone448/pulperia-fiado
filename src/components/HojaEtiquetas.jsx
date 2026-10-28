import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { formatColones } from '../utils/dateUtils'
import { nombreParaEtiqueta } from '../utils/productos'

const PT = 96 / 72
const PRECIO_PT = 52
const NOMBRE_PT = 16
const NOMBRE_MIN_PT = 11

async function esperarFuentes() {
  try {
    await Promise.all([
      document.fonts.load(`900 ${PRECIO_PT}pt Inter`, '₡0123456789'),
      document.fonts.load(`800 ${NOMBRE_PT}pt Inter`, 'Aa'),
    ])
    await document.fonts.ready
  } catch {
    // Sin la fuente se imprime con la de respaldo; no vale la pena frenar la impresión.
  }
}

// Achica el precio hasta que quepa en el ancho de la etiqueta y el nombre
// hasta que entre en dos renglones (tres como máximo si no queda otra).
function ajustarTextos(contenedor) {
  for (const etiqueta of contenedor.querySelectorAll('.etiqueta')) {
    const nombre = etiqueta.querySelector('.etiqueta-nombre')
    const precio = etiqueta.querySelector('.etiqueta-precio')
    const disponible = etiqueta.clientWidth - parseFloat(getComputedStyle(etiqueta).paddingLeft) * 2

    precio.style.fontSize = `${PRECIO_PT * PT}px`
    const anchoPrecio = precio.getBoundingClientRect().width
    if (anchoPrecio > disponible) {
      precio.style.fontSize = `${Math.floor(PRECIO_PT * PT * (disponible / anchoPrecio) * 100) / 100}px`
    }

    let tamano = NOMBRE_PT * PT
    nombre.style.fontSize = `${tamano}px`
    while (tamano > NOMBRE_MIN_PT * PT && nombre.getBoundingClientRect().height > tamano * 1.1 * 2 + 1) {
      tamano -= 0.5
      nombre.style.fontSize = `${tamano}px`
    }
  }
}

// Monta las etiquetas fuera de #root, las ajusta, abre el diálogo de impresión
// y avisa cuando termina. La clase del body oculta el resto de la app solo
// mientras se imprime (ver estilos de impresión de etiquetas en index.css).
export default function HojaEtiquetas({ productos, onTerminado }) {
  const areaRef = useRef(null)

  useEffect(() => {
    let cancelado = false

    async function imprimir() {
      await esperarFuentes()
      if (cancelado || !areaRef.current) return
      ajustarTextos(areaRef.current)
      document.body.classList.add('imprimiendo-etiquetas')
      window.print()
      document.body.classList.remove('imprimiendo-etiquetas')
      if (!cancelado) onTerminado()
    }
    imprimir()

    return () => {
      cancelado = true
      document.body.classList.remove('imprimiendo-etiquetas')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="etiquetas-print-area" ref={areaRef}>
      {productos.map(([key, p]) => (
        <div className="etiqueta" key={key}>
          <div className="etiqueta-nombre">{nombreParaEtiqueta(p.nombre)}</div>
          <div className="etiqueta-precio">{formatColones(p.precio)}</div>
        </div>
      ))}
    </div>,
    document.body,
  )
}
