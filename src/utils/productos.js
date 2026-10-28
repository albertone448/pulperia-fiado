// Productos para las etiquetas de precio de los estantes.
// Nodo /productos/{llave}: nombre, precio, codigos, idSistema, pendiente,
// impresoAlgunaVez, precioActualizadoEn, actualizadoPor, creado.
// Los importados del sistema de ventas usan la llave `s{Id}`; los creados a
// mano usan la llave que genera push().

export const MAX_DIGITOS_CODIGO = 14

export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function limpiarNombre(nombre) {
  return String(nombre || '').replace(/\s+/g, ' ').trim()
}

// Los lectores de código mandan solo dígitos. En el XML hay códigos con letras
// y uno de 143 dígitos que no sirven para buscar.
export function soloDigitos(codigo) {
  const digitos = String(codigo || '').replace(/\D/g, '')
  return digitos.length > 0 && digitos.length <= MAX_DIGITOS_CODIGO ? digitos : ''
}

export function parsearCodigos(texto) {
  const codigos = String(texto || '')
    .split(/[\s,;]+/)
    .map(soloDigitos)
    .filter(Boolean)
  return [...new Set(codigos)]
}

export function codigosDe(producto) {
  return Array.isArray(producto.codigos) ? producto.codigos : Object.values(producto.codigos || {})
}

// Busca por nombre (todas las palabras, sin tildes ni mayúsculas) o por código de barras.
export function buscarProductos(productos, texto, limite = 60) {
  const consulta = normalizar(texto)
  if (!consulta) return []
  const palabras = consulta.split(' ')
  const soloNumeros = /^\d+$/.test(consulta)
  const resultado = []
  for (const [key, p] of Object.entries(productos)) {
    const coincide =
      palabras.every((palabra) => normalizar(p.nombre).includes(palabra)) ||
      (soloNumeros && codigosDe(p).some((c) => c.includes(consulta)))
    if (coincide) resultado.push([key, p])
  }
  resultado.sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre, 'es'))
  return resultado.slice(0, limite)
}

export function buscarPorCodigoExacto(productos, codigo) {
  const digitos = soloDigitos(codigo)
  if (!digitos) return null
  return Object.entries(productos).find(([, p]) => codigosDe(p).includes(digitos)) || null
}

// Lee el XML exportado por el sistema de ventas. Devuelve los productos
// importables y cuántos se omitieron (sin nombre o con precio en cero).
export function parsearXmlProductos(textoXml) {
  const doc = new DOMParser().parseFromString(textoXml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('El archivo no es un XML válido')
  }

  const hijo = (el, nombre) => Array.from(el.children).find((c) => c.localName === nombre)
  const productos = []
  let omitidos = 0

  for (const item of doc.getElementsByTagName('PosItem')) {
    if (item.getAttribute('xsi:type') !== 'Product') continue

    const id = Number(hijo(item, 'Id')?.textContent)
    const nombre = limpiarNombre(hijo(item, 'Name')?.textContent)
    const precio = Math.round(Number(hijo(item, 'Price')?.textContent))

    if (!Number.isFinite(id) || nombre.length < 2 || !(precio > 0)) {
      omitidos += 1
      continue
    }

    const codigos = []
    for (const barcode of hijo(item, 'Barcodes')?.children || []) {
      const codigo = soloDigitos(hijo(barcode, 'Value')?.textContent)
      if (codigo && !codigos.includes(codigo)) codigos.push(codigo)
    }
    productos.push({ id, nombre, precio, codigos })
  }

  if (productos.length === 0 && omitidos === 0) {
    throw new Error('No se encontraron productos en el archivo')
  }
  return { productos, omitidos }
}

// Compara lo importado contra lo guardado y arma los cambios a escribir.
// - La primera importación (todavía no hay nada que venga del sistema) no deja
//   nada pendiente: nadie quiere reimprimir 3,000 etiquetas.
// - Después, un producto nuevo queda pendiente, y un cambio de precio solo si
//   ese producto ya se imprimió alguna vez (no todo lo que se vende lleva etiqueta).
export function planificarImportacion(existentes, importados, ahora = Date.now()) {
  const primeraVez = !Object.values(existentes).some((p) => p.idSistema != null)
  const escrituras = {}
  const nuevos = []
  const preciosCambiados = []
  let sinCambios = 0

  for (const imp of importados) {
    const key = `s${imp.id}`
    const actual = existentes[key]

    if (!actual) {
      escrituras[key] = {
        nombre: imp.nombre,
        precio: imp.precio,
        codigos: imp.codigos,
        idSistema: imp.id,
        pendiente: !primeraVez,
        impresoAlgunaVez: false,
        creado: ahora,
      }
      nuevos.push(imp)
      continue
    }

    let cambio = false
    if (actual.precio !== imp.precio) {
      escrituras[`${key}/precio`] = imp.precio
      escrituras[`${key}/precioActualizadoEn`] = ahora
      if (actual.impresoAlgunaVez) escrituras[`${key}/pendiente`] = true
      preciosCambiados.push({ ...imp, precioAnterior: actual.precio })
      cambio = true
    }
    if (actual.nombre !== imp.nombre) {
      escrituras[`${key}/nombre`] = imp.nombre
      cambio = true
    }
    // Se suman los códigos nuevos sin quitar los que se agregaron a mano.
    const codigosActuales = codigosDe(actual)
    const codigosFinales = [...new Set([...codigosActuales, ...imp.codigos])]
    if (codigosFinales.length !== codigosActuales.length) {
      escrituras[`${key}/codigos`] = codigosFinales
      cambio = true
    }
    if (!cambio) sinCambios += 1
  }

  return { primeraVez, escrituras, nuevos, preciosCambiados, sinCambios }
}

// Firebase aguanta bien actualizaciones grandes, pero se parten en tandas
// para no mandar un solo mensaje de varios MB.
export function partirEscrituras(escrituras, tamano = 800) {
  const entradas = Object.entries(escrituras)
  const tandas = []
  for (let i = 0; i < entradas.length; i += tamano) {
    tandas.push(Object.fromEntries(entradas.slice(i, i + tamano)))
  }
  return tandas
}

// Evita que "500 g" o "1.5 L" se partan en dos renglones dejando la unidad sola.
export function nombreParaEtiqueta(nombre) {
  return limpiarNombre(nombre).replace(/(\d)\s+(kg|g|gr|mg|ml|l|lt|lts|cc|oz|un|und)\b/gi, '$1 $2')
}
